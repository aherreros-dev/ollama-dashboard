import { useState, useEffect } from "react";
import { useStore } from "../store";
import type { ChatOptions } from "../api/types";

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1.5">
        <label className="text-xs text-gray-500 dark:text-zinc-400">{label}</label>
        <span className="text-xs font-mono text-gray-700 dark:text-zinc-300">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export function SettingsPanel() {
  const { chats, activeChatId, setChatSystem, setChatOptions } = useStore();
  const activeChat = activeChatId ? chats[activeChatId] : null;
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    if (activeChat) setSystemPrompt(activeChat.systemPrompt);
  }, [activeChat?.systemPrompt]);

  const handleSystemChange = (v: string) => {
    setSystemPrompt(v);
    if (activeChatId) setChatSystem(activeChatId, v);
  };

  const opt = (key: keyof ChatOptions, v: number) => {
    if (activeChatId) setChatOptions(activeChatId, { [key]: v });
  };

  if (!activeChat) return null;
  const o = activeChat.options;

  return (
    <div className="w-64 shrink-0 border-l border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-4 overflow-y-auto">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Ajustes</h3>

      <div className="mb-5">
        <label className="text-xs text-gray-500 dark:text-zinc-400 block mb-1.5">System prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => handleSystemChange(e.target.value)}
          placeholder="Eres un asistente útil..."
          className="w-full h-28 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-gray-800 dark:text-zinc-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-gray-400 dark:placeholder-zinc-500"
        />
      </div>

      <Slider label="Temperature"    value={o.temperature}   min={0}    max={2}     step={0.05} onChange={(v) => opt("temperature", v)} />
      <Slider label="Top P"          value={o.top_p}         min={0}    max={1}     step={0.01} onChange={(v) => opt("top_p", v)} />
      <Slider label="Top K"          value={o.top_k}         min={0}    max={100}   step={1}    onChange={(v) => opt("top_k", v)} />
      <Slider label="Context"        value={o.num_ctx}       min={512}  max={32768} step={512}  onChange={(v) => opt("num_ctx", v)} />
      <Slider label="Max tokens"     value={o.num_predict}   min={-1}   max={4096}  step={1}    onChange={(v) => opt("num_predict", v)} />
      <Slider label="Repeat penalty" value={o.repeat_penalty} min={0.5} max={2}     step={0.05} onChange={(v) => opt("repeat_penalty", v)} />
      <Slider label="Seed"           value={o.seed}          min={0}    max={999999} step={1}   onChange={(v) => opt("seed", v)} />
    </div>
  );
}
