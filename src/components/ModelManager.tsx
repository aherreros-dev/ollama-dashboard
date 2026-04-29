import { useState, useEffect } from "react";
import { Download, Trash2, AlertCircle } from "lucide-react";
import * as api from "../api/ollama";
import { useStore } from "../store";
import type { PullProgress } from "../api/types";

interface ModelManagerProps {
  className?: string;
}

export function ModelManager({ className }: ModelManagerProps) {
  const { models, setModels } = useStore();
  const [pullName, setPullName] = useState("");
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = api.onPullProgress((progress) => {
      setPullProgress(progress);
      if (
        progress.status === "success" ||
        progress.status === "already running"
      ) {
        setPulling(false);
        setPullProgress(null);
        refreshModels();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const refreshModels = async () => {
    try {
      const list = await api.listModels();
      setModels(list);
    } catch (e) {
      console.error("Failed to list models:", e);
    }
  };

  const handlePull = async () => {
    if (!pullName.trim()) return;

    setPulling(true);
    setError(null);
    setPullProgress({ name: pullName, status: "starting..." });

    try {
      await api.pullModel(pullName.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPulling(false);
      setPullProgress(null);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete model "${name}"?`)) return;

    try {
      await api.deleteModel(name);
      await refreshModels();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <div className={`p-6 ${className || ""}`}>
      <h2 className="text-xl font-semibold text-zinc-100 mb-6">
        Model Manager
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-800 rounded-lg flex items-center gap-2 text-red-200">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">
          Pull New Model
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={pullName}
            onChange={(e) => setPullName(e.target.value)}
            placeholder="e.g., llama3.1:8b"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
            disabled={pulling}
          />
          <button
            onClick={handlePull}
            disabled={pulling || !pullName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm flex items-center gap-2"
          >
            <Download size={16} />
            {pulling ? "Pulling..." : "Pull"}
          </button>
        </div>

        {pulling && pullProgress && (
          <div className="mt-3 p-3 bg-zinc-800 rounded-lg">
            <div className="text-sm text-zinc-300">{pullProgress.status}</div>
            {pullProgress.progress !== undefined && (
              <div className="mt-2 h-2 bg-zinc-700 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${Math.min(pullProgress.progress, 100)}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">
          Installed Models
        </h3>
        <div className="space-y-2">
          {models.length === 0 ? (
            <p className="text-zinc-500 text-sm">No models installed</p>
          ) : (
            models.map((model) => {
              const details = model.details || {};
              return (
                <div
                  key={model.name}
                  className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-100">
                      {model.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {details.parameter_size} · {details.quantization_level} ·{" "}
                      {formatSize(model.size)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(model.name)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
