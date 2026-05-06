#!/usr/bin/env python3
"""
Stable Diffusion local server for ollama-dash.
Exposes an AUTOMATIC1111-compatible API on port 7860.
Model: Lykon/dreamshaper-8  —  stored on the SSD.

Memory strategy: lazy-load. The model is NOT loaded on startup.
The frontend calls /sdapi/v1/preload when the SD tab is opened and
/sdapi/v1/unload when switching back to chat, so only one large model
lives in RAM at a time (SD ≈ 4.5 GB float32, or Ollama model).
"""

import base64
import gc
import json
import threading
from io import BytesIO
from pathlib import Path

import torch
import uvicorn
from diffusers import (
    StableDiffusionPipeline,
    StableDiffusionImg2ImgPipeline,
    EulerAncestralDiscreteScheduler,
    EulerDiscreteScheduler,
    DPMSolverMultistepScheduler,
    DPMSolverSDEScheduler,
    DDIMScheduler,
    PNDMScheduler,
)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

# ── Config ────────────────────────────────────────────────────────────────────

SD_DIR     = Path(__file__).parent
MODELS_DIR = SD_DIR / "models"
MODEL_ID   = "Lykon/dreamshaper-8"
DEVICE     = "mps" if torch.backends.mps.is_available() else "cpu"
# float32 is required: float16 produces NaN in DreamShaper 8's UNet on MPS.
DTYPE      = torch.float32
PORT       = 7860

SCHEDULERS = {
    "Euler a":   EulerAncestralDiscreteScheduler,
    "Euler":     EulerDiscreteScheduler,
    "DPM++ 2M":  DPMSolverMultistepScheduler,
    "DPM++ SDE": DPMSolverSDEScheduler,
    "DDIM":      DDIMScheduler,
    "PNDM":      PNDMScheduler,
}

MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ── Global state ──────────────────────────────────────────────────────────────

_pipe: StableDiffusionPipeline | None = None
_img2img: StableDiffusionImg2ImgPipeline | None = None
_inference_lock = threading.Lock()   # prevents concurrent txt2img/img2img
_state_lock     = threading.Lock()   # guards _ready / _loading flags
_ready   = False
_loading = False
_progress = {"step": 0, "total": 20, "percent": 0.0, "image": None}

# ── Model loader ──────────────────────────────────────────────────────────────

def _do_load():
    global _pipe, _img2img, _ready, _loading
    try:
        print(f"[SD] Loading {MODEL_ID} on {DEVICE} ({DTYPE}) …")
        pipe = StableDiffusionPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=DTYPE,
            cache_dir=str(MODELS_DIR),
            safety_checker=None,
            requires_safety_checker=False,
        ).to(DEVICE)
        pipe.enable_attention_slicing(1)
        pipe.enable_vae_slicing()

        img2img = StableDiffusionImg2ImgPipeline(**pipe.components).to(DEVICE)
        img2img.enable_attention_slicing(1)
        img2img.enable_vae_slicing()

        _pipe    = pipe
        _img2img = img2img
        with _state_lock:
            _ready   = True
            _loading = False
        print("[SD] Model ready — accepting requests on port 7860")
    except Exception as e:
        print(f"[SD] Load failed: {e}")
        with _state_lock:
            _loading = False

def _ensure_loaded():
    """Trigger background load if the model is not yet loaded or loading."""
    global _loading
    with _state_lock:
        if _ready or _loading:
            return
        _loading = True
    threading.Thread(target=_do_load, daemon=True).start()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_b64(img: Image.Image) -> str:
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

def _from_b64(s: str) -> Image.Image:
    return Image.open(BytesIO(base64.b64decode(s))).convert("RGB")

def _generator(seed: int):
    if seed == -1:
        return None
    g = torch.Generator(DEVICE)
    g.manual_seed(seed)
    return g

def _apply_sampler(pipe, name: str):
    cls = SCHEDULERS.get(name, EulerAncestralDiscreteScheduler)
    incompatible = {"final_sigmas_type", "algorithm_type", "solver_type",
                    "lower_order_final", "use_karras_sigmas", "use_exponential_sigmas",
                    "use_beta_sigmas", "timestep_spacing"}
    config = {k: v for k, v in pipe.scheduler.config.items() if k not in incompatible}
    try:
        pipe.scheduler = cls.from_config(config)
    except Exception:
        pipe.scheduler = cls.from_config(pipe.scheduler.config)

def _on_step(pipe, step, _ts, kwargs):
    """Progress callback: updates state and decodes a preview every 5 steps."""
    total = _progress["total"]
    _progress["step"]    = step + 1
    _progress["percent"] = (step + 1) / total if total else 0

    if step % 5 == 0:
        try:
            latents = kwargs.get("latents")
            if latents is not None:
                with torch.no_grad():
                    safe = torch.nan_to_num(latents, nan=0.0)
                    decoded = pipe.vae.decode(
                        safe / pipe.vae.config.scaling_factor
                    ).sample
                    decoded = (decoded / 2 + 0.5).clamp(0, 1)
                    arr = (decoded.cpu().permute(0, 2, 3, 1).float().numpy()[0] * 255).round().astype("uint8")
                    _progress["image"] = _to_b64(Image.fromarray(arr))
        except Exception:
            pass
    return kwargs

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Lifecycle endpoints ───────────────────────────────────────────────────────

@app.post("/sdapi/v1/preload")
async def preload():
    """Start loading the model in the background (no-op if already loaded/loading)."""
    _ensure_loaded()
    with _state_lock:
        return {"status": "loading" if _loading else "ready"}

@app.post("/sdapi/v1/unload")
async def unload():
    """Free the model from RAM so other models (Ollama) can use the memory."""
    global _pipe, _img2img, _ready
    with _state_lock:
        if _loading:
            return {"status": "loading"}  # can't unload while mid-load
        _ready   = False
        _pipe    = None
        _img2img = None
    gc.collect()
    if DEVICE == "mps":
        torch.mps.empty_cache()
    print("[SD] Model unloaded — RAM freed")
    return {"status": "unloaded"}

# ── AUTOMATIC1111-compatible endpoints ────────────────────────────────────────

@app.get("/sdapi/v1/sd-models")
async def sd_models():
    if not _ready:
        return []
    return [{"title": "DreamShaper 8", "model_name": "dreamshaper-8", "hash": ""}]

@app.get("/sdapi/v1/samplers")
async def samplers():
    return [{"name": k} for k in SCHEDULERS]

@app.get("/sdapi/v1/progress")
async def get_progress():
    return {
        "progress":      _progress["percent"],
        "state":         {"step": _progress["step"]},
        "current_image": _progress["image"],
    }

@app.post("/sdapi/v1/interrupt")
async def interrupt():
    return {}

@app.get("/sdapi/v1/options")
async def get_options():
    return {"sd_model_checkpoint": "DreamShaper 8"}

@app.post("/sdapi/v1/options")
async def set_options(_: dict):
    return {}

@app.get("/sdapi/v1/status")
async def get_status():
    with _state_lock:
        if _ready:
            return {"status": "ready"}
        elif _loading:
            return {"status": "loading"}
        else:
            return {"status": "unloaded"}


class Txt2ImgReq(BaseModel):
    prompt:          str   = ""
    negative_prompt: str   = ""
    width:           int   = 512
    height:          int   = 512
    steps:           int   = 8
    cfg_scale:       float = 7.0
    seed:            int   = -1
    sampler_name:    str   = "DPM++ 2M"
    batch_size:      int   = 1

class Img2ImgReq(BaseModel):
    init_images:        list[str] = []
    prompt:             str       = ""
    negative_prompt:    str       = ""
    denoising_strength: float     = 0.75
    width:              int       = 512
    height:             int       = 512
    steps:              int       = 8
    cfg_scale:          float     = 7.0
    seed:               int       = -1
    batch_size:         int       = 1


@app.post("/sdapi/v1/txt2img")
async def txt2img(req: Txt2ImgReq):
    if not _ready:
        _ensure_loaded()
        raise HTTPException(503, "Modelo cargando, espera un momento e inténtalo de nuevo")

    _progress.update({"total": req.steps, "step": 0, "percent": 0.0, "image": None})

    with _inference_lock:
        _apply_sampler(_pipe, req.sampler_name)
        result = _pipe(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            width=req.width,
            height=req.height,
            num_inference_steps=req.steps,
            guidance_scale=req.cfg_scale,
            num_images_per_prompt=req.batch_size,
            generator=_generator(req.seed),
            callback_on_step_end=_on_step,
            callback_on_step_end_tensor_inputs=["latents"],
        )
    return {"images": [_to_b64(img) for img in result.images], "info": json.dumps({"seed": req.seed})}


@app.post("/sdapi/v1/img2img")
async def img2img(req: Img2ImgReq):
    if not _ready:
        _ensure_loaded()
        raise HTTPException(503, "Modelo cargando, espera un momento e inténtalo de nuevo")
    if not req.init_images:
        return {"images": [], "info": "{}"}

    init = _from_b64(req.init_images[0]).resize((req.width, req.height))
    _progress.update({"total": req.steps, "step": 0, "percent": 0.0, "image": None})

    with _inference_lock:
        _apply_sampler(_img2img, req.sampler_name)
        result = _img2img(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            image=init,
            strength=req.denoising_strength,
            num_inference_steps=req.steps,
            guidance_scale=req.cfg_scale,
            num_images_per_prompt=req.batch_size,
            generator=_generator(req.seed),
            callback_on_step_end=_on_step,
            callback_on_step_end_tensor_inputs=["latents"],
        )
    return {"images": [_to_b64(img) for img in result.images], "info": json.dumps({"seed": req.seed})}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")
