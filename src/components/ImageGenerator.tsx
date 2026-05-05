import { useState, useEffect, useCallback, useRef } from "react";
import {
  Image,
  Square,
  Download,
  Settings2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  Upload,
} from "lucide-react";
import {
  generateImage,
  generateImageFromImage,
  checkSDStatus,
  getSDModels,
  getSDSamplers,
  abortGeneration,
  switchSDModel,
} from "../api/stable-diffusion";
import type {
  ImageGenerationOptions,
  Img2ImgOptions,
  ImageGenerationProgress,
  StableDiffusionModel,
} from "../api/types";
import { SD_SAMPLERS } from "../api/types";

type Mode = "txt2img" | "img2img";

export function ImageGenerator() {
  const [sdAvailable, setSdAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [switchingModel, setSwitchingModel] = useState(false);
  const [warmingUp, setWarmingUp] = useState(false);
  const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState<ImageGenerationProgress | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<Mode>("txt2img");

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [steps, setSteps] = useState(15);
  const [cfgScale, setCfgScale] = useState(7);
  const [seed, setSeed] = useState(-1);
  const [sampler, setSampler] = useState("DPM++ 2M");
  const [batchSize, setBatchSize] = useState(1);
  const [selectedModel, setSelectedModel] = useState("");

  const [initImage, setInitImage] = useState<string | null>(null);
  const [initImagePreview, setInitImagePreview] = useState<string | null>(null);
  const [denoisingStrength, setDenoisingStrength] = useState(0.75);

  const [sdModels, setSdModels] = useState<StableDiffusionModel[]>([]);
  const [samplers, setSamplers] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const modelReady = sdModels.length > 0;

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const available = await checkSDStatus();
      setSdAvailable(available);
      if (available) {
        const [models, samplerList] = await Promise.all([
          getSDModels(),
          getSDSamplers(),
        ]);
        setSdModels(models);
        setSamplers(samplerList.length > 0 ? samplerList : [...SD_SAMPLERS]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al conectar con Stable Diffusion");
      setSdAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-retry silently every 5 s while server is not yet reachable.
  // Covers the window between app launch and the SD server being ready.
  useEffect(() => {
    if (sdAvailable !== false || loading) return;
    const id = setInterval(async () => {
      try {
        const available = await checkSDStatus();
        if (available) {
          setSdAvailable(true);
          setError(null);
          const [models, sl] = await Promise.all([getSDModels(), getSDSamplers()]);
          setSdModels(models);
          setSamplers(sl.length > 0 ? sl : [...SD_SAMPLERS]);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(id);
  }, [sdAvailable, loading]);

  // Poll every 8 s while the server is up but the model is still loading.
  useEffect(() => {
    if (!sdAvailable || modelReady) return;
    const id = setInterval(async () => {
      try {
        const models = await getSDModels();
        if (models.length > 0) {
          setSdModels(models);
          setError(null);
          const sl = await getSDSamplers();
          setSamplers(sl.length > 0 ? sl : [...SD_SAMPLERS]);
        }
      } catch {
        // ignore transient errors during polling
      }
    }, 8000);
    return () => clearInterval(id);
  }, [sdAvailable, modelReady]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setInitImage(dataUrl.split(",")[1]);
      setInitImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!modelReady) return;
    if (!prompt.trim()) {
      setError("Escribe un prompt para generar la imagen");
      return;
    }
    if (mode === "img2img" && !initImage) {
      setError("Sube una imagen de entrada para el modo imagen→imagen");
      return;
    }

    setGenerating(true);
    setWarmingUp(true);
    setError(null);
    setProgress({ step: 0, totalSteps: steps, percent: 0 });
    setImages([]);
    warmupTimerRef.current = setTimeout(() => setWarmingUp(false), 12000);

    try {
      if (selectedModel) {
        setSwitchingModel(true);
        await switchSDModel(selectedModel);
        setSwitchingModel(false);
      }

      const baseOptions: ImageGenerationOptions = {
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim(),
        width,
        height,
        steps,
        cfgScale,
        seed,
        sampler,
        batchSize,
      };

      let result: string[];
      if (mode === "img2img" && initImage) {
        const opts: Img2ImgOptions = { ...baseOptions, initImage, denoisingStrength };
        result = await generateImageFromImage(opts, setProgress);
      } else {
        result = await generateImage(baseOptions, setProgress);
      }
      setImages(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en la generación");
    } finally {
      setGenerating(false);
      setWarmingUp(false);
      setSwitchingModel(false);
      setProgress(null);
      if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current);
    }
  }, [prompt, negativePrompt, width, height, steps, cfgScale, seed, sampler, batchSize, selectedModel, mode, initImage, denoisingStrength]);

  const handleAbort = useCallback(async () => {
    try {
      await abortGeneration();
    } finally {
      setGenerating(false);
      setWarmingUp(false);
      setProgress(null);
      if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current);
    }
  }, []);

  const handleDownload = useCallback((imageData: string, index: number) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${imageData}`;
    link.download = `generated_${Date.now()}_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const sizePresets = [
    { label: "512×512", width: 512, height: 512 },
    { label: "512×768", width: 512, height: 768 },
    { label: "768×512", width: 768, height: 512 },
    { label: "768×768", width: 768, height: 768 },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Conectando con Stable Diffusion...
        </p>
      </div>
    );
  }

  if (sdAvailable === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="text-center max-w-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-2">
            Stable Diffusion no disponible
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-5">
            El servidor de imagen no está activo. Si aún no lo has instalado, ejecuta el setup una vez:
          </p>
          <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 text-left space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                Instalar (solo la primera vez)
              </p>
              <pre className="text-xs bg-gray-100 dark:bg-zinc-700 p-3 rounded-lg text-gray-600 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">{`cd stable-diffusion/
chmod +x setup.sh
./setup.sh`}</pre>
            </div>
            <div className="text-xs bg-gray-100 dark:bg-zinc-700 p-3 rounded-lg text-gray-600 dark:text-zinc-300 space-y-1">
              <p>El modelo DreamShaper 8 (~2 GB) se descarga automáticamente la primera vez.</p>
              <p className="text-gray-400 dark:text-zinc-500 mt-1">Una vez instalado, el servidor arranca solo al abrir la app.</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              Ruta de instalación: <code className="font-mono">~/.ollama-dash/stable-diffusion/</code>
            </p>
          </div>
          <button
            onClick={checkStatus}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm transition-colors mx-auto"
          >
            <RefreshCw size={16} />
            Reintentar conexión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-purple-600" />
          <h2 className="text-base font-semibold">Generador de imágenes</h2>
          {modelReady ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              <Loader2 size={10} className="animate-spin" />
              Cargando modelo...
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className={`p-2 rounded-lg transition-colors ${
            showSettings
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
              : "text-gray-500 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
          title="Opciones avanzadas"
        >
          <Settings2 size={18} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-72 border-r border-gray-200 dark:border-zinc-800 overflow-y-auto p-4 space-y-4 shrink-0">

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl">
            {(["txt2img", "img2img"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  mode === m
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-sm"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
                }`}
              >
                {m === "txt2img" ? "Texto → Imagen" : "Imagen → Imagen"}
              </button>
            ))}
          </div>

          {/* img2img: upload + denoising */}
          {mode === "img2img" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                  Imagen de entrada
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors overflow-hidden relative"
                >
                  {initImagePreview ? (
                    <img
                      src={initImagePreview}
                      alt="Input"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <Upload size={20} className="text-gray-400 dark:text-zinc-500 mb-1" />
                      <p className="text-xs text-gray-400 dark:text-zinc-500">Haz clic para subir</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  Variación: {denoisingStrength.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={denoisingStrength}
                  onChange={(e) => setDenoisingStrength(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>Fiel al original</span>
                  <span>Más creativo</span>
                </div>
              </div>
            </div>
          )}

          {/* Prompt */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="a beautiful mountain landscape, golden hour, photorealistic..."
              className="w-full h-24 px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm resize-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-shadow"
            />
          </div>

          {/* Negative prompt */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              Prompt negativo
            </label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="blurry, low quality, watermark..."
              className="w-full h-16 px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm resize-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-shadow"
            />
          </div>

          {/* Size presets */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              Tamaño
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {sizePresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => { setWidth(preset.width); setHeight(preset.height); }}
                  className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                    width === preset.width && height === preset.height
                      ? "bg-purple-100 dark:bg-purple-900/30 border-purple-500 text-purple-700 dark:text-purple-300"
                      : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-600"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1.5">
              512×512 es lo más rápido en M1
            </p>
          </div>

          {/* Advanced settings */}
          {showSettings && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                  Pasos: {steps}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>Rápido</span>
                  <span>Calidad</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                  CFG Scale: {cfgScale}
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={cfgScale}
                  onChange={(e) => setCfgScale(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>Libre</span>
                  <span>Estricto</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                  Imágenes por lote: {batchSize}
                </label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                  Sampler
                </label>
                <select
                  value={sampler}
                  onChange={(e) => setSampler(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm"
                >
                  {samplers.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                  Semilla (-1 = aleatoria)
                </label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm"
                />
              </div>

              {sdModels.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                    Modelo{switchingModel && (
                      <span className="ml-1 text-purple-500 font-normal">(cambiando...)</span>
                    )}
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm"
                  >
                    <option value="">Por defecto</option>
                    {sdModels.map((m) => (
                      <option key={m.model_name} value={m.title}>
                        {m.title || m.model_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Generate button */}
          <button
            onClick={generating ? handleAbort : handleGenerate}
            disabled={!generating && (!prompt.trim() || !modelReady)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors ${
              generating
                ? "bg-red-600 hover:bg-red-700 text-white"
                : !modelReady
                ? "bg-amber-500 opacity-80 cursor-not-allowed text-white"
                : "bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
            }`}
          >
            {generating ? (
              switchingModel ? (
                <><Loader2 size={16} className="animate-spin" /> Cambiando modelo...</>
              ) : (
                <><Square size={16} /> Detener</>
              )
            ) : !modelReady ? (
              <><Loader2 size={16} className="animate-spin" /> Cargando modelo...</>
            ) : (
              <><Zap size={16} /> Generar</>
            )}
          </button>

          {/* Progress bar */}
          {generating && !switchingModel && (
            <div className="space-y-1.5">
              {warmingUp ? (
                <>
                  <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                    Preparando... (la primera vez tarda más)
                  </p>
                  <div className="h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: "100%" }} />
                  </div>
                </>
              ) : progress ? (
                <>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400">
                    <span>Paso {progress.step}/{progress.totalSteps}</span>
                    <span>{Math.round(progress.percent * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 transition-all duration-500"
                      style={{ width: `${progress.percent * 100}%` }}
                    />
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Right panel: image output */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-zinc-900">
          {/* Live preview while generating */}
          {generating && progress?.currentImage && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">
                Vista previa en tiempo real
              </p>
              <img
                src={`data:image/png;base64,${progress.currentImage}`}
                alt="Preview"
                className="rounded-xl max-w-full shadow-md opacity-80"
              />
            </div>
          )}

          {/* Finished images */}
          {images.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  {images.length} imagen{images.length !== 1 ? "es" : ""} generada{images.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => images.forEach((img, i) => handleDownload(img, i))}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Download size={14} />
                  Descargar todo
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={`data:image/png;base64,${img}`}
                      alt={`Generada ${i + 1}`}
                      className="w-full rounded-xl shadow-md"
                    />
                    <button
                      onClick={() => handleDownload(img, i)}
                      className="absolute bottom-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download size={16} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : !generating ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500">
              <Image className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">Escribe un prompt y pulsa Generar</p>
              <p className="text-xs mt-1 text-gray-400 dark:text-zinc-600">
                Las imágenes aparecerán aquí
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
