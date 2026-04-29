import { useEffect, useState } from "react";
import { useStore } from "../store";
import type { OllamaModel } from "../api/types";

export function ModelSelector() {
  const { models, chats, activeChatId, setChatModel } = useStore();
  const [selected, setSelected] = useState("");

  const activeChat = activeChatId ? chats[activeChatId] : null;

  useEffect(() => {
    if (activeChat) setSelected(activeChat.model);
  }, [activeChat?.model]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(e.target.value);
    if (activeChatId) setChatModel(activeChatId, e.target.value);
  };

  const fmt = (m: OllamaModel) => {
    const p = m.details?.parameter_size || "";
    const q = m.details?.quantization_level || "";
    return `${m.name}${p ? ` · ${p}` : ""}${q ? ` · ${q}` : ""}`;
  };

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-100 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors max-w-xs truncate"
    >
      {models.length === 0 ? (
        <option value="">Sin modelos</option>
      ) : (
        models.map((m) => (
          <option key={m.name} value={m.name}>{fmt(m)}</option>
        ))
      )}
    </select>
  );
}
