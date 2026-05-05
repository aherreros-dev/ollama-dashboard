/**
 * Stable Diffusion API
 * Connects to AUTOMATIC1111 WebUI running locally on port 7860
 */

import type {
  ImageGenerationOptions,
  Img2ImgOptions,
  ImageGenerationResponse,
  ImageGenerationProgress,
  StableDiffusionModel,
} from "./types";

const HOSTS = ["http://127.0.0.1:7860", "http://127.0.0.1:7861"] as const;

// Cache the active host for 30 s to avoid repeated probing
let cachedHost: string | null = null;
let cacheExpiry = 0;

async function firstAvailableHost(): Promise<string | null> {
  if (cachedHost && Date.now() < cacheExpiry) return cachedHost;

  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}/sdapi/v1/sd-models`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        cachedHost = host;
        cacheExpiry = Date.now() + 30_000;
        return host;
      }
    } catch {
      continue;
    }
  }
  cachedHost = null;
  return null;
}

export function invalidateHostCache() {
  cachedHost = null;
  cacheExpiry = 0;
}

export async function checkSDStatus(): Promise<boolean> {
  return (await firstAvailableHost()) !== null;
}

export async function getSDModels(): Promise<StableDiffusionModel[]> {
  const host = await firstAvailableHost();
  if (!host) return [];
  try {
    const res = await fetch(`${host}/sdapi/v1/sd-models`);
    if (!res.ok) return [];
    const models = await res.json();
    return models.map((m: Record<string, string>) => ({
      title: m.title || m.model_name || "Unknown",
      model_name: m.model_name || "",
      hash: m.hash,
      sha256: m.sha256,
      filename: m.filename,
      config: m.config,
    }));
  } catch {
    return [];
  }
}

export async function getSDSamplers(): Promise<string[]> {
  const host = await firstAvailableHost();
  if (!host) return [];
  try {
    const res = await fetch(`${host}/sdapi/v1/samplers`);
    if (!res.ok) return [];
    const samplers = await res.json();
    return samplers.map((s: { name: string }) => s.name);
  } catch {
    return [];
  }
}

// ─── shared progress poller ───────────────────────────────────────────────────

function startProgressPoller(
  host: string,
  totalSteps: number,
  onProgress: (p: ImageGenerationProgress) => void,
): ReturnType<typeof setInterval> {
  return setInterval(async () => {
    try {
      const res = await fetch(`${host}/sdapi/v1/progress`);
      if (res.ok) {
        const data = await res.json();
        onProgress({
          step: data.state?.step ?? 0,
          totalSteps,
          percent: data.progress ?? 0,
          currentImage: data.current_image ?? undefined,
        });
      }
    } catch {
      // ignore mid-generation errors
    }
  }, 800);
}

// ─── txt2img ──────────────────────────────────────────────────────────────────

export async function generateImage(
  options: ImageGenerationOptions,
  onProgress?: (progress: ImageGenerationProgress) => void,
): Promise<string[]> {
  const host = await firstAvailableHost();
  if (!host) {
    throw new Error(
      "Stable Diffusion WebUI no está activo. Arráncalo con: ./webui.sh --api",
    );
  }

  const totalSteps = options.steps ?? 20;
  let poller: ReturnType<typeof setInterval> | undefined;
  if (onProgress) poller = startProgressPoller(host, totalSteps, onProgress);

  try {
    const res = await fetch(`${host}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: options.prompt,
        negative_prompt: options.negativePrompt ?? "",
        width: options.width ?? 512,
        height: options.height ?? 512,
        steps: totalSteps,
        cfg_scale: options.cfgScale ?? 7,
        seed: options.seed ?? -1,
        sampler_name: options.sampler ?? "Euler a",
        batch_size: options.batchSize ?? 1,
      }),
    });

    if (!res.ok) throw new Error(`SD error ${res.status}: ${await res.text()}`);
    const data: ImageGenerationResponse = await res.json();
    return data.images;
  } finally {
    if (poller !== undefined) clearInterval(poller);
  }
}

// ─── img2img ─────────────────────────────────────────────────────────────────

export async function generateImageFromImage(
  options: Img2ImgOptions,
  onProgress?: (progress: ImageGenerationProgress) => void,
): Promise<string[]> {
  const host = await firstAvailableHost();
  if (!host) {
    throw new Error(
      "Stable Diffusion WebUI no está activo. Arráncalo con: ./webui.sh --api",
    );
  }

  const totalSteps = options.steps ?? 20;
  let poller: ReturnType<typeof setInterval> | undefined;
  if (onProgress) poller = startProgressPoller(host, totalSteps, onProgress);

  try {
    const res = await fetch(`${host}/sdapi/v1/img2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        init_images: [options.initImage],
        denoising_strength: options.denoisingStrength ?? 0.75,
        prompt: options.prompt,
        negative_prompt: options.negativePrompt ?? "",
        width: options.width ?? 512,
        height: options.height ?? 512,
        steps: totalSteps,
        cfg_scale: options.cfgScale ?? 7,
        seed: options.seed ?? -1,
        sampler_name: options.sampler ?? "Euler a",
        batch_size: options.batchSize ?? 1,
      }),
    });

    if (!res.ok) throw new Error(`SD error ${res.status}: ${await res.text()}`);
    const data: ImageGenerationResponse = await res.json();
    return data.images;
  } finally {
    if (poller !== undefined) clearInterval(poller);
  }
}

// ─── control ──────────────────────────────────────────────────────────────────

export async function abortGeneration(): Promise<void> {
  const host = await firstAvailableHost();
  if (!host) return;
  try {
    await fetch(`${host}/sdapi/v1/interrupt`, { method: "POST" });
  } catch {
    // ignore
  }
}

export async function switchSDModel(modelTitle: string): Promise<boolean> {
  const host = await firstAvailableHost();
  if (!host) return false;
  try {
    const res = await fetch(`${host}/sdapi/v1/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sd_model_checkpoint: modelTitle }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
