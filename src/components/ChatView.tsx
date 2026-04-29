import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, Paperclip } from "lucide-react";
import { useStore } from "../store";
import { useOllamaStream } from "../hooks/useOllamaStream";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage, Metrics } from "../api/types";

export function ChatView() {
  const { chats, activeChatId, appendMessage, updateLastAssistant } = useStore();
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [accumulatedContent, setAccumulatedContent] = useState("");
  const [currentMetrics, setCurrentMetrics] = useState<Metrics | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = activeChatId ? chats[activeChatId] : null;
  const { send, abort, streaming, error } = useOllamaStream();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages, accumulatedContent]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  const handleSubmit = useCallback(async () => {
    if (!activeChatId || !activeChat) return;
    const trimmed = input.trim();
    if (!trimmed && images.length === 0) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: trimmed,
      images: images.length > 0 ? images : undefined,
    };

    appendMessage(activeChatId, userMsg);
    setInput("");
    setImages([]);
    setAccumulatedContent("");
    setCurrentMetrics(null);

    const messages: ChatMessage[] = [];
    if (activeChat.systemPrompt) messages.push({ role: "system", content: activeChat.systemPrompt });
    messages.push(...activeChat.messages, userMsg);

    let currentContent = "";
    const chatId = activeChatId;

    await send(
      activeChat.model,
      messages,
      activeChat.options,
      (delta) => {
        currentContent += delta;
        setAccumulatedContent(currentContent);
      },
      (finalMetrics) => {
        setCurrentMetrics(finalMetrics);
        if (chatId && currentContent) updateLastAssistant(chatId, currentContent);
        setAccumulatedContent("");
      },
    );
  }, [activeChatId, activeChat, input, images, send, appendMessage, updateLastAssistant]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setImages((p) => [...p, ev.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const fmt = (m: Metrics) =>
    `${m.evalCount} tok · ${m.tokensPerSec.toFixed(1)} tok/s · ${(m.totalMs / 1000).toFixed(1)}s`;

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-zinc-500">
        <p className="text-sm">Selecciona un chat o crea uno nuevo</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-w-0">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {activeChat.messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {accumulatedContent && (
          <MessageBubble
            message={{ role: "assistant", content: accumulatedContent }}
            isStreaming={streaming}
          />
        )}
        {error && (
          <div className="mx-auto max-w-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Metrics */}
      {currentMetrics && !streaming && (
        <div className="px-4 py-1.5 text-xs text-gray-400 dark:text-zinc-500 border-t border-gray-100 dark:border-zinc-800/50 text-right">
          {fmt(currentMetrics)}
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-zinc-800/50">
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-zinc-700" />
                <button
                  onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center"
                >×</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-shadow">
          <label className="cursor-pointer text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 p-1 shrink-0 self-end mb-0.5 transition-colors">
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            <Paperclip size={16} />
          </label>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter nueva línea)"
            className="flex-1 bg-transparent text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 text-sm resize-none focus:outline-none"
            rows={1}
            style={{ minHeight: "24px", maxHeight: "120px" }}
          />

          {streaming ? (
            <button
              onClick={abort}
              className="p-1.5 bg-red-500 hover:bg-red-600 rounded-xl text-white shrink-0 self-end transition-colors"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && images.length === 0}
              className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white shrink-0 self-end transition-colors"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
