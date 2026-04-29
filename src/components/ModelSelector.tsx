import { useEffect, useState } from "react";
import { useStore } from "../store";
import type { OllamaModel } from "../api/types";

interface ModelSelectorProps {
  className?: string;
}

export function ModelSelector({ className }: ModelSelectorProps) {
  const { models, chats, activeChatId, setChatModel } = useStore();
  const [selected, setSelected] = useState<string>("");

  const activeChat = activeChatId ? chats[activeChatId] : null;

  useEffect(() => {
    if (activeChat) {
      setSelected(activeChat.model);
    }
  }, [activeChat?.model]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setSelected(newModel);
    if (activeChatId) {
      setChatModel(activeChatId, newModel);
    }
  };

  const formatModelOption = (model: OllamaModel) => {
    const details = model.details || {};
    const paramSize = details.parameter_size || "";
    const quant = details.quantization_level || "";
    return `${model.name} · ${paramSize} · ${quant}`;
  };

  return (
    <select
      value={selected}
      onChange={handleChange}
      className={`bg-zinc-800 text-zinc-100 px-3 py-1.5 rounded border border-zinc-700 text-sm focus:outline-none focus:border-zinc-500 ${className || ""}`}
    >
      {models.length === 0 ? (
        <option value="">No models available</option>
      ) : (
        models.map((model) => (
          <option key={model.name} value={model.name}>
            {formatModelOption(model)}
          </option>
        ))
      )}
    </select>
  );
}
