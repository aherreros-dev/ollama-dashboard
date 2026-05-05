export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model?: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  images?: string[];
  thinking?: string;
}

export interface ChatOptions {
  temperature: number;
  top_p: number;
  top_k: number;
  num_ctx: number;
  num_predict: number;
  repeat_penalty: number;
  seed: number;
  stop?: string[];
}

export interface ChatChunk {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
    images?: string[];
    thinking?: string;
  };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface Chat {
  id: string;
  title: string;
  model: string;
  systemPrompt: string;
  options: ChatOptions;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface PullProgress {
  name: string;
  status: string;
  progress?: number;
}

export interface Metrics {
  tokensPerSec: number;
  evalCount: number;
  totalMs: number;
  promptEvalCount: number;
}

export const DEFAULT_OPTIONS: ChatOptions = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  num_ctx: 4096,
  num_predict: -1,
  repeat_penalty: 1.1,
  seed: 0,
};

// ============================================
// Image Generation Types (Stable Diffusion)
// ============================================

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  sampler?: string;
  model?: string;
  batchSize?: number;
}

export interface Img2ImgOptions extends ImageGenerationOptions {
  initImage: string;       // base64 PNG/JPEG
  denoisingStrength?: number; // 0.0–1.0, default 0.75
}

export interface ImageGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  seed: number;
  sampler_name: string;
  model_id?: string;
}

export interface ImageGenerationResponse {
  images: string[]; // Base64 encoded images
  seed: number;
  info: string;
}

export interface ImageGenerationProgress {
  step: number;
  totalSteps: number;
  percent: number;
  currentImage?: string; // Base64 preview
}

export interface StableDiffusionModel {
  title: string;
  model_name: string;
  hash?: string;
  sha256?: string;
  filename?: string;
  config?: string;
}

export const DEFAULT_IMAGE_OPTIONS: ImageGenerationOptions = {
  prompt: "",
  negativePrompt: "",
  width: 512,
  height: 512,
  steps: 20,
  cfgScale: 7,
  seed: -1,
  sampler: "Euler a",
  batchSize: 1,
};

// Popular Stable Diffusion models
export const SD_MODELS = [
  { id: "dreamforge-anime", name: "DreamForge Anime" },
  { id: "v1-5", name: "Stable Diffusion 1.5" },
  { id: "v2-1", name: "Stable Diffusion 2.1" },
  { id: "dreamshaper", name: "DreamShaper" },
  { id: "revAnimated", name: "Rev Animated" },
  { id: "realisticVision", name: "Realistic Vision" },
  { id: "anythingV5", name: "Anything V5" },
  { id: "openjourney", name: "OpenJourney" },
] as const;

// Samplers available in Stable Diffusion
export const SD_SAMPLERS = [
  "Euler",
  "Euler a",
  "DPM++ 2M",
  "DPM++ 2M Karras",
  "DPM++ SDE",
  "DPM++ SDE Karras",
  "DDIM",
  "PLMS",
  "UniPC",
] as const;
