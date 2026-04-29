import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square } from "lucide-react";
import { useStore } from "../store";
import { useOllamaStream } from "../hooks/useOllamaStream";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage, Metrics } from "../api/types";

interface ChatViewProps {
  className?: string;
}

export function ChatView({ className }: ChatViewProps) {
  const { chats, activeChatId, appendMessage, updateLastAssistant } =
    useStore();
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [accumulatedContent, setAccumulatedContent] = useState("");
  const [currentMetrics, setCurrentMetrics] = useState<Metrics | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = activeChatId ? chats[activeChatId] : null;
  const { send, abort, streaming, error, metrics } = useOllamaStream();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages, accumulatedContent]);

  useEffect(() => {
    if (metrics) {
      setCurrentMetrics(metrics);
    }
  }, [metrics]);

  const handleSubmit = useCallback(async () => {
    if (!activeChatId || !activeChat) return;

    const trimmedInput = input.trim();
    if (!trimmedInput && images.length === 0) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmedInput,
      images: images.length > 0 ? images : undefined,
    };

    appendMessage(activeChatId, userMessage);
    setInput("");
    setImages([]);
    setAccumulatedContent("");
    setCurrentMetrics(null);

    const messages: ChatMessage[] = [];

    if (activeChat.systemPrompt) {
      messages.push({ role: "system", content: activeChat.systemPrompt });
    }

    messages.push(...activeChat.messages);
    messages.push(userMessage);

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
        if (chatId && currentContent) {
          updateLastAssistant(chatId, currentContent);
        }
        setAccumulatedContent("");
      },
    );
  }, [
    activeChatId,
    activeChat,
    input,
    images,
    send,
    appendMessage,
    updateLastAssistant,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImages((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const formatMetrics = (m: Metrics) => {
    const tokens = m.evalCount;
    const tps = m.tokensPerSec.toFixed(1);
    const ms = m.totalMs.toFixed(0);
    const prompt = m.promptEvalCount;
    return `${tokens} tok · ${tps} tok/s · ${ms}ms · ${prompt} prompt`;
  };

  if (!activeChat) {
    return (
      <div
        className={`flex-1 flex items-center justify-center text-zinc-500 ${className || ""}`}
      >
        <p>Select or create a chat to get started</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {activeChat.messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        {accumulatedContent && (
          <MessageBubble
            message={{ role: "assistant", content: accumulatedContent }}
            isStreaming={streaming}
          />
        )}
        {error && (
          <div className="bg-red-900/50 border border-red-800 rounded-lg p-3 text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>

      {currentMetrics && !streaming && (
        <div className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-800">
          {formatMetrics(currentMetrics)}
        </div>
      )}

      <div className="p-4 border-t border-zinc-800">
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {images.map((img, idx) => (
              <div key={idx} className="relative">
                <img
                  src={img}
                  alt=""
                  className="w-16 h-16 object-cover rounded"
                />
                <button
                  onClick={() =>
                    setImages((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="absolute -top-1 -right-1 bg-red-600 rounded-full w-4 h-4 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <label className="cursor-pointer p-2 text-zinc-400 hover:text-zinc-200">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            📎
          </label>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm resize-none focus:outline-none focus:border-zinc-500"
            rows={1}
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />

          {streaming ? (
            <button
              onClick={abort}
              className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
            >
              <Square size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && images.length === 0}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white"
            >
              <Send size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
