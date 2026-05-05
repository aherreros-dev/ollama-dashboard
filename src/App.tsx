import { useState, useEffect } from "react";
import { SlidersHorizontal, Database, Sun, Moon, Monitor, ImageIcon } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { ModelSelector } from "./components/ModelSelector";
import { ChatView } from "./components/ChatView";
import { SettingsPanel } from "./components/SettingsPanel";
import { ModelManager } from "./components/ModelManager";
import { ImageGenerator } from "./components/ImageGenerator";
import { useStore } from "./store";
import type { Theme } from "./store";
import * as api from "./api/ollama";

type View = "chat" | "models" | "images";

const THEME_CYCLE: Theme[] = ["auto", "light", "dark"];
const THEME_ICON = { auto: Monitor, light: Sun, dark: Moon };
const THEME_LABEL = { auto: "Automático", light: "Claro", dark: "Oscuro" };

export default function App() {
  const [view, setView] = useState<View>("chat");
  const [showSettings, setShowSettings] = useState(false);
  const { setModels, newChat, activeChatId, models, theme, setTheme } = useStore();
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      return;
    }
    if (theme === "light") {
      root.classList.remove("dark");
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (e: MediaQueryList | MediaQueryListEvent) => {
      e.matches ? root.classList.add("dark") : root.classList.remove("dark");
    };
    apply(mq);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const list = await api.listModels();
        setModels(list);
        setOllamaError(null);
        if (list.length === 0) setView("models");
      } catch (e) {
        setOllamaError(e instanceof Error ? e.message : String(e));
      }
    };
    loadModels();
    const interval = setInterval(loadModels, 30000);
    return () => clearInterval(interval);
  }, [setModels]);

  const handleNewChat = () => {
    newChat(models[0]?.name || "");
    setView("chat");
  };

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
  };

  const ThemeIcon = THEME_ICON[theme];

  const navBtn = (v: View, icon: React.ReactNode, title: string) => (
    <button
      onClick={() => { setView(v); setShowSettings(false); }}
      className={`p-2 rounded transition-colors ${
        view === v
          ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
          : "text-gray-400 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-100"
      }`}
      title={title}
    >
      {icon}
    </button>
  );

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors duration-200">
      <Sidebar onNewChat={handleNewChat} />

      <div className="flex-1 flex flex-col min-w-0">
        {ollamaError && (
          <div className="bg-red-50 dark:bg-red-900/50 border-b border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-200">
            No se puede conectar con Ollama. Ejecútalo con:{" "}
            <code className="bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded">ollama serve</code>
          </div>
        )}

        <header className="h-14 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0 bg-white dark:bg-zinc-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-semibold shrink-0 tracking-tight">ollama-dash</h1>
            {view === "chat" && <ModelSelector />}
            {view === "images" && (
              <span className="text-sm text-gray-400 dark:text-zinc-500">Stable Diffusion</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={cycleTheme}
              className="p-2 rounded text-gray-400 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-100 transition-colors"
              title={`Tema: ${THEME_LABEL[theme]}`}
            >
              <ThemeIcon size={17} />
            </button>
            {navBtn("images", <ImageIcon size={17} />, "Generar imágenes")}
            {navBtn("models", <Database size={17} />, "Gestionar modelos")}
            {view === "chat" && activeChatId && (
              <button
                onClick={() => setShowSettings((s) => !s)}
                className={`p-2 rounded transition-colors ${
                  showSettings
                    ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                    : "text-gray-400 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-100"
                }`}
                title="Ajustes del chat"
              >
                <SlidersHorizontal size={17} />
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
          ) : view === "images" ? (
            <ImageGenerator />
          ) : (
            <ModelManager className="flex-1" />
          )}
        </main>
      </div>
    </div>
  );
}
