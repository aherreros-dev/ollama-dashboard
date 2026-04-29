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
  const isAssistant = message.role === "assistant";

  const renderContent = () => {
    if (message.images && message.images.length > 0) {
      return (
        <div className="space-y-2">
          {message.images.map((img, i) => (
            <img key={i} src={img} alt="" className="max-w-full rounded-lg" />
          ))}
          {message.content && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              className="prose prose-sm max-w-none dark:prose-invert"
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      );
    }

    if (!message.content && isStreaming) {
      return <span className="animate-pulse text-gray-400 dark:text-zinc-400">▍</span>;
    }

    if (isAssistant || message.role === "system") {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          className="prose prose-sm max-w-none dark:prose-invert"
        >
          {message.content}
        </ReactMarkdown>
      );
    }

    return <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>;
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm shadow-sm">
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[80%] bg-white dark:bg-zinc-800/80 border border-gray-100 dark:border-zinc-700/50 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm shadow-sm text-gray-800 dark:text-zinc-100">
        {renderContent()}
      </div>
    </div>
  );
});
