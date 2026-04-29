import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { ChatMessage } from "../api/types";
import "katex/dist/katex.min.css";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const baseClasses = "max-w-[80%] rounded-lg px-4 py-2 text-sm";

  let bgClasses = "";
  if (isUser) {
    bgClasses = "bg-blue-600 text-white ml-auto";
  } else if (isSystem) {
    bgClasses = "bg-zinc-700 text-zinc-300";
  } else {
    bgClasses = "bg-zinc-900 border border-zinc-800 text-zinc-100";
  }

  const renderContent = () => {
    if (message.images && message.images.length > 0) {
      return (
        <div className="space-y-2">
          {message.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt="Uploaded"
              className="max-w-full rounded"
            />
          ))}
          {message.content && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              className="prose prose-invert prose-sm max-w-none"
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      );
    }

    if (!message.content && isStreaming) {
      return <span className="animate-pulse">▍</span>;
    }

    if (message.role === "assistant" || message.role === "system") {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          className="prose prose-invert prose-sm max-w-none"
        >
          {message.content}
        </ReactMarkdown>
      );
    }

    return <p className="whitespace-pre-wrap">{message.content}</p>;
  };

  return (
    <div className={`${baseClasses} ${bgClasses} mb-3`}>{renderContent()}</div>
  );
});
