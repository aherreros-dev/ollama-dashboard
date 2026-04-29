import { useState, useEffect } from "react";
import { Download, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import * as api from "../api/ollama";
import { useStore } from "../store";
import type { PullProgress } from "../api/types";

export function ModelManager({ className }: { className?: string }) {
  const { models, setModels } = useStore();
  const [pullName, setPullName] = useState("");
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = api.onPullProgress((progress) => {
      setPullProgress(progress);
      if (progress.status === "success") {
        setPulling(false);
        setPullProgress(null);
        refreshModels();
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const refreshModels = async () => {
    try { setModels(await api.listModels()); }
    catch (e) { console.error(e); }
  };

  const handlePull = async () => {
    if (!pullName.trim()) return;
    setPulling(true);
    setError(null);
    setPullProgress({ name: pullName, status: "Iniciando…" });
    try {
      await api.pullModel(pullName.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPulling(false);
      setPullProgress(null);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`¿Eliminar el modelo "${name}"?`)) return;
    try { await api.deleteModel(name); await refreshModels(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const fmtSize = (b: number) => {
    const gb = b / 1073741824;
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(b / 1048576).toFixed(0)} MB`;
  };

  return (
    <div className={`p-6 overflow-y-auto ${className || ""}`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Modelos</h2>
          <button onClick={refreshModels} className="p-2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle size={15} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Pull */}
        <div className="mb-8 p-4 bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-2xl">
          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">Descargar modelo</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={pullName}
              onChange={(e) => setPullName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !pulling && handlePull()}
              placeholder="ej. llama3.1:8b"
              className="flex-1 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-gray-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-gray-400 dark:placeholder-zinc-500"
              disabled={pulling}
            />
            <button
              onClick={handlePull}
              disabled={pulling || !pullName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Download size={15} />
              {pulling ? "Descargando…" : "Descargar"}
            </button>
          </div>

          {pulling && pullProgress && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1.5">{pullProgress.status}</p>
              {pullProgress.progress !== undefined && (
                <div className="h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(pullProgress.progress, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Installed */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-3">
            Instalados ({models.length})
          </h3>
          <div className="space-y-2">
            {models.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-zinc-500 py-4 text-center">No hay modelos instalados</p>
            ) : (
              models.map((model) => (
                <div
                  key={model.name}
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-zinc-100">{model.name}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                      {model.details?.parameter_size} · {model.details?.quantization_level} · {fmtSize(model.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(model.name)}
                    className="p-2 text-gray-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
