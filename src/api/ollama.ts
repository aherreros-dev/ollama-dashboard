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
