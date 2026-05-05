#!/usr/bin/env python3
"""
Stable Diffusion local server for ollama-dash.
Exposes an AUTOMATIC1111-compatible API on port 7860.
Model: Lykon/dreamshaper-8  —  stored on the SSD.
"""

import base64
import json
import threading
from io import BytesIO
from pathlib import Path

import torch
import uvicorn
from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

# ── Config ────────────────────────────────────────────────────────────────────

SD_DIR     = Path(__file__).parent
MODELS_DIR = SD_DIR / "models"
MODEL_ID   = "Lykon/dreamshaper-8"
DEVICE     = "mps" if torch.backends.mps.is_available() else "cpu"
DTYPE      = torch.float16 if DEVICE == "mps" else torch.float32
PORT       = 7860

MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ── Global state ──────────────────────────────────────────────────────────────

_pipe: StableDiffusionPipeline | None = None
_img2img: StableDiffusionImg2ImgPipeline | None = None
_lock = threading.Lock()
_ready = False
_progress = {"step": 0, "total": 20, "percent": 0.0, "image": None}

# ── Model loader (background thread so server is reachable immediately) ───────

def _load():
    global _pipe, _img2img, _ready
    print(f"[SD] Loading {MODEL_ID} on {DEVICE} ({DTYPE}) …")
    _pipe = StableDiffusionPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=DTYPE,
        cache_dir=str(MODELS_DIR),
        safety_checker=None,
        requires_safety_checker=False,
    ).to(DEVICE)
    _pipe.enable_attention_slicing()
    _img2img = StableDiffusionImg2ImgPipeline(**_pipe.components).to(DEVICE)
    _ready = True
    print("[SD] Model ready — accepting requests on port 7860")

threading.Thread(target=_load, daemon=True).start()

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

def _on_step(pipe, step, _ts, kwargs):
    """Progress callback: updates state and decodes a preview every 5 steps."""
    total = _progress["total"]
    _progress["step"]    = step
    _progress["percent"] = step / total if total else 0

    if step % 5 == 0:
        try:
            latents = kwargs.get("latents")
            if latents is not None:
                with torch.no_grad():
                    decoded = pipe.vae.decode(
                        latents / pipe.vae.config.scaling_factor
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

# ── Endpoints (AUTOMATIC1111-compatible subset) ───────────────────────────────

@app.get("/sdapi/v1/sd-models")
async def sd_models():
    if not _ready:
        return []
    return [{"title": "DreamShaper 8", "model_name": "dreamshaper-8", "hash": ""}]

@app.get("/sdapi/v1/samplers")
async def samplers():
    return [
        {"name": "Euler a"}, {"name": "Euler"},
        {"name": "DPM++ 2M"}, {"name": "DPM++ SDE"},
        {"name": "DDIM"}, {"name": "PNDM"},
    ]

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


class Txt2ImgReq(BaseModel):
    prompt:          str   = ""
    negative_prompt: str   = ""
    width:           int   = 512
    height:          int   = 512
    steps:           int   = 20
    cfg_scale:       float = 7.0
    seed:            int   = -1
    sampler_name:    str   = "Euler a"
    batch_size:      int   = 1

class Img2ImgReq(BaseModel):
    init_images:        list[str] = []
    prompt:             str       = ""
    negative_prompt:    str       = ""
    denoising_strength: float     = 0.75
    width:              int       = 512
    height:             int       = 512
    steps:              int       = 20
    cfg_scale:          float     = 7.0
    seed:               int       = -1
    batch_size:         int       = 1


@app.post("/sdapi/v1/txt2img")
async def txt2img(req: Txt2ImgReq):
    if not _ready:
        raise HTTPException(503, "Modelo cargando, espera un momento e inténtalo de nuevo")

    _progress.update({"total": req.steps, "step": 0, "percent": 0.0, "image": None})

    with _lock:
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
        raise HTTPException(503, "Modelo cargando, espera un momento e inténtalo de nuevo")
    if not req.init_images:
        return {"images": [], "info": "{}"}

    init = _from_b64(req.init_images[0]).resize((req.width, req.height))
    _progress.update({"total": req.steps, "step": 0, "percent": 0.0, "image": None})

    with _lock:
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
