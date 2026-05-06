import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type { OllamaModel, PullProgress, ChatChunk } from "./types";

export async function listModels(): Promise<OllamaModel[]> {
  const result = await invoke<{ models: OllamaModel[] }>("list_models");
  return result.models;
}

export async function showModel(name: string): Promise<unknown> {
  return invoke("show_model", { name });
}

export async function deleteModel(name: string): Promise<unknown> {
  return invoke("delete_model", { name });
}

export async function pullModel(name: string): Promise<unknown> {
  return invoke("pull_model", { name });
}

export async function ps(): Promise<unknown> {
  return invoke("ps");
}

export async function chatStream(
  requestId: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return invoke("chat_stream", { requestId, payload });
}

export async function abortStream(requestId: string): Promise<unknown> {
  return invoke("abort_stream", { requestId });
}

export function onChunk(
  requestId: string,
  callback: (chunk: ChatChunk) => void,
): Promise<UnlistenFn> {
  return listen<ChatChunk>(`chat-chunk-${requestId}`, (event) => {
    callback(event.payload);
  });
}

export function onDone(
  requestId: string,
  callback: (data: ChatChunk) => void,
): Promise<UnlistenFn> {
  return listen<ChatChunk>(`chat-done-${requestId}`, (event) => {
    callback(event.payload);
  });
}

export function onPullProgress(
  callback: (progress: PullProgress) => void,
): Promise<UnlistenFn> {
  return listen<PullProgress>("pull-progress", (event) => {
    callback(event.payload);
  });
}

const OLLAMA_BASE = "http://127.0.0.1:11434";

export async function unloadModel(name: string): Promise<void> {
  await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name, keep_alive: 0 }),
  }).catch(() => {});
}

export async function unloadAllModels(): Promise<void> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/ps`);
    if (!res.ok) return;
    const data = await res.json();
    const loaded: { name: string }[] = data.models ?? [];
    await Promise.all(loaded.map((m) => unloadModel(m.name)));
  } catch {
    // Ollama not running — no-op
  }
}
