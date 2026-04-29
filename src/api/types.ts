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
