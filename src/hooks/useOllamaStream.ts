import { useRef, useCallback, useState } from "react";
import * as api from "../api/ollama";
import type { ChatMessage, ChatOptions, Metrics } from "../api/types";

interface UseOllamaStreamReturn {
  send: (
    model: string,
    messages: ChatMessage[],
    options: ChatOptions,
    onDelta: (content: string) => void,
    onComplete: (metrics: Metrics) => void,
  ) => Promise<void>;
  abort: () => void;
  streaming: boolean;
  error: string | null;
  metrics: Metrics | null;
}

export function useOllamaStream(): UseOllamaStreamReturn {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const currentReqId = useRef<string | null>(null);
  const watchdogTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastChunkTime = useRef<number>(0);

  const clearWatchdog = useCallback(() => {
    if (watchdogTimer.current) {
      clearInterval(watchdogTimer.current);
      watchdogTimer.current = null;
    }
  }, []);

  const abort = useCallback(() => {
    if (currentReqId.current) {
      api.abortStream(currentReqId.current).catch(console.error);
      currentReqId.current = null;
    }
    clearWatchdog();
    setStreaming(false);
  }, [clearWatchdog]);

  const send = useCallback(
    async (
      model: string,
      messages: ChatMessage[],
      options: ChatOptions,
      onDelta: (content: string) => void,
      onComplete: (metrics: Metrics) => void,
    ) => {
      const requestId = crypto.randomUUID();
      currentReqId.current = requestId;
      setStreaming(true);
      setError(null);
      setMetrics(null);
      lastChunkTime.current = Date.now();

      const payload = {
        model,
        messages,
        options: {
          temperature: options.temperature,
          top_p: options.top_p,
          top_k: options.top_k,
          num_ctx: options.num_ctx,
          num_predict: options.num_predict,
          repeat_penalty: options.repeat_penalty,
          seed: options.seed,
          stop: options.stop,
        },
        stream: true,
        keep_alive: "5m",
      };

      let unlistenChunk: (() => void) | null = null;
      let unlistenDone: (() => void) | null = null;

      const startTime = Date.now();
      let evalCount = 0;
      let promptEvalCount = 0;
      let totalDuration = 0;

      watchdogTimer.current = setInterval(() => {
        const now = Date.now();
        if (now - lastChunkTime.current > 60000) {
          abort();
          setError("timeout");
        }
      }, 5000);

      try {
        unlistenChunk = await api.onChunk(requestId, (chunk) => {
          lastChunkTime.current = Date.now();
          if (chunk.message?.content) {
            onDelta(chunk.message.content);
          }
          if (chunk.eval_count) evalCount = chunk.eval_count;
          if (chunk.prompt_eval_count)
            promptEvalCount = chunk.prompt_eval_count;
          if (chunk.total_duration) totalDuration = chunk.total_duration;
        });

        unlistenDone = await api.onDone(requestId, (data) => {
          clearWatchdog();
          setStreaming(false);
          currentReqId.current = null;

          const computedMetrics: Metrics = {
            tokensPerSec:
              evalCount > 0 && totalDuration > 0
                ? evalCount / (totalDuration / 1e9)
                : 0,
            evalCount,
            totalMs: totalDuration / 1e6,
            promptEvalCount,
          };

          setMetrics(computedMetrics);
          onComplete(computedMetrics);
        });

        await api.chatStream(requestId, payload);
      } catch (e) {
        clearWatchdog();
        setStreaming(false);
        currentReqId.current = null;
        const errMsg = e instanceof Error ? e.message : String(e);
        setError(errMsg);

        if (
          errMsg.toLowerCase().includes("out of memory") ||
          errMsg.toLowerCase().includes("oom")
        ) {
          setError(errMsg + " Try reducing num_ctx in settings.");
        }
      } finally {
        if (unlistenChunk) unlistenChunk();
        if (unlistenDone) unlistenDone();
        clearWatchdog();
      }
    },
    [abort, clearWatchdog],
  );

  return { send, abort, streaming, error, metrics };
}
