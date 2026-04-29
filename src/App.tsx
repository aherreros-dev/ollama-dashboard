import { useState, useEffect } from "react";
import { SlidersHorizontal, Database } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { ModelSelector } from "./components/ModelSelector";
import { ChatView } from "./components/ChatView";
import { SettingsPanel } from "./components/SettingsPanel";
import { ModelManager } from "./components/ModelManager";
import { useStore } from "./store";
import * as api from "./api/ollama";

type View = "chat" | "models";

export default function App() {
  const [view, setView] = useState<View>("chat");
  const [showSettings, setShowSettings] = useState(false);
  const { setModels, newChat, activeChatId, models } = useStore();
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const list = await api.listModels();
        setModels(list);
        setOllamaError(null);

        if (list.length === 0) {
          setView("models");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setOllamaError(msg);
        console.error("Failed to connect to Ollama:", e);
      }
    };

    loadModels();
    const interval = setInterval(loadModels, 30000);
    return () => clearInterval(interval);
  }, [setModels]);

  const handleNewChat = () => {
    const defaultModel = models[0]?.name || "gemma3:e2b";
    newChat(defaultModel);
    setView("chat");
  };

  return (
    <div className="h-screen flex bg-zinc-950 text-zinc-100">
      <Sidebar onNewChat={handleNewChat} />

      <div className="flex-1 flex flex-col min-w-0">
        {ollamaError && (
          <div className="bg-red-900/50 border-b border-red-800 px-4 py-2 text-sm text-red-200">
            Cannot connect to Ollama. Start it with:{" "}
            <code className="bg-red-900 px-2 py-0.5 rounded">ollama serve</code>
          </div>
        )}

        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="text-lg font-semibold shrink-0">ollama-dash</h1>
            {view === "chat" && <ModelSelector />}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { setView("models"); setShowSettings(false); }}
              className={`p-2 rounded ${view === "models" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"}`}
              title="Manage models"
            >
              <Database size={18} />
            </button>
            {view === "chat" && activeChatId && (
              <button
                onClick={() => setShowSettings((s) => !s)}
                className={`p-2 rounded ${showSettings ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"}`}
                title="Toggle settings"
              >
                <SlidersHorizontal size={18} />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          {view === "chat" ? (
            <>
              <ChatView />
              {activeChatId && showSettings && <SettingsPanel />}
            </>
          ) : (
            <ModelManager className="flex-1" />
          )}
        </main>
      </div>
    </div>
  );
}
