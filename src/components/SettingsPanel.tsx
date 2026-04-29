import { useState, useEffect } from "react";
import { useStore } from "../store";
import type { ChatOptions } from "../api/types";

interface SettingsPanelProps {
  className?: string;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <label className="text-xs text-zinc-400">{label}</label>
        <span className="text-xs font-mono text-zinc-300">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}

export function SettingsPanel({ className }: SettingsPanelProps) {
  const { chats, activeChatId, setChatSystem, setChatOptions } = useStore();
  const activeChat = activeChatId ? chats[activeChatId] : null;
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    if (activeChat) {
      setSystemPrompt(activeChat.systemPrompt);
    }
  }, [activeChat?.systemPrompt]);

  const handleSystemChange = (value: string) => {
    setSystemPrompt(value);
    if (activeChatId) {
      setChatSystem(activeChatId, value);
    }
  };

  const handleOptionChange = (key: keyof ChatOptions, value: number) => {
    if (activeChatId) {
      setChatOptions(activeChatId, { [key]: value });
    }
  };

  if (!activeChat) {
    return null;
  }

  const options = activeChat.options;

  return (
    <div
      className={`w-72 border-l border-zinc-800 p-4 overflow-y-auto ${className || ""}`}
    >
      <h3 className="text-sm font-medium text-zinc-300 mb-4">Settings</h3>

      <div className="mb-6">
        <label className="text-xs text-zinc-400 block mb-2">
          System Prompt
        </label>
        <textarea
          value={systemPrompt}
          onChange={(e) => handleSystemChange(e.target.value)}
          placeholder="You are a helpful assistant..."
          className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm resize-none focus:outline-none focus:border-zinc-500"
        />
      </div>

      <Slider
        label="Temperature"
        value={options.temperature}
        min={0}
        max={2}
        step={0.05}
        onChange={(v) => handleOptionChange("temperature", v)}
      />

      <Slider
        label="Top P"
        value={options.top_p}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => handleOptionChange("top_p", v)}
      />

      <Slider
        label="Top K"
        value={options.top_k}
        min={0}
        max={100}
        step={1}
        onChange={(v) => handleOptionChange("top_k", v)}
      />

      <Slider
        label="Context Length"
        value={options.num_ctx}
        min={512}
        max={32768}
        step={512}
        onChange={(v) => handleOptionChange("num_ctx", v)}
      />

      <Slider
        label="Max Tokens"
        value={options.num_predict}
        min={-1}
        max={4096}
        step={1}
        onChange={(v) => handleOptionChange("num_predict", v)}
      />

      <Slider
        label="Repeat Penalty"
        value={options.repeat_penalty}
        min={0.5}
        max={2}
        step={0.05}
        onChange={(v) => handleOptionChange("repeat_penalty", v)}
      />

      <Slider
        label="Seed"
        value={options.seed}
        min={0}
        max={999999}
        step={1}
        onChange={(v) => handleOptionChange("seed", v)}
      />
    </div>
  );
}
