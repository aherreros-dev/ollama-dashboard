# ollama-dash

A native macOS desktop app for chatting with local [Ollama](https://ollama.com) models and generating images with Stable Diffusion — no cloud, no subscriptions, everything runs on your machine.

Built with Tauri + React + Rust.

## Features

**Chat**
- Stream responses from any locally installed Ollama model
- Per-chat settings: temperature, top-p, top-k, context length, repeat penalty, seed
- System prompt per chat
- Markdown + LaTeX rendering
- Download and delete models from within the app
- Ollama starts automatically when the app opens

**Image generation** *(optional — requires Stable Diffusion setup below)*
- Text → Image (txt2img)
- Image → Image (img2img) with adjustable variation strength
- Live preview during generation
- Adjustable steps, CFG scale, sampler, seed, batch size
- Model switching
- One-click download of generated images

## Download

Go to [Releases](../../releases) and download the latest `.dmg` (Apple Silicon).

Open the DMG, drag the app to any folder, and double-click to launch.

> **First launch:** macOS may show a security warning because the app is not notarized.  
> Go to **System Settings → Privacy & Security → Open Anyway**.

## Prerequisites

- macOS 11 or later (Apple Silicon / Intel)
- [Ollama](https://ollama.com) installed

The app starts Ollama automatically if it is not already running.

## Stable Diffusion setup

Image generation is optional. If you skip this, the chat features work without any extra setup.

### Requirements

- Python 3.10–3.13 (install with `brew install python@3.13` if needed)
- ~3 GB of free disk space (model + venv)

### Install

```bash
# Clone the repo or download the stable-diffusion/ folder
cd stable-diffusion/

chmod +x setup.sh
./setup.sh
```

`setup.sh` will:
1. Create a Python virtual environment at `~/.ollama-dash/stable-diffusion/`
2. Install PyTorch (with Metal/MPS support on Apple Silicon) + Diffusers
3. Copy the server files

The **DreamShaper 8** model (~2 GB) downloads automatically the first time the server starts.

### How it works

When you open ollama-dash, it automatically starts a local Stable Diffusion server at `http://127.0.0.1:7860`. The SD tab shows:

- **"Cargando modelo..."** (amber) — server is up, model is still downloading/loading
- **"Conectado"** (green) — ready to generate images

The server stops when you close the app.

### External drive

To store the model on an external drive and save space on your main disk:

```bash
# Run setup first, then move and symlink:
mv ~/.ollama-dash/stable-diffusion /Volumes/MyDrive/stable-diffusion
ln -s /Volumes/MyDrive/stable-diffusion ~/.ollama-dash/stable-diffusion
```

### Server path

The app looks for the server at:

```
~/.ollama-dash/stable-diffusion/start.sh
```

If that file is absent, the SD tab shows setup instructions and the chat features continue to work normally.

## Build from source

### Requirements

- [Node.js](https://nodejs.org) + [pnpm](https://pnpm.io)
- [Rust](https://rustup.rs)

### Steps

```bash
# Install JS dependencies
pnpm install

# Run in development mode (hot reload)
pnpm tauri dev

# Build release .app and .dmg
pnpm tauri build
```

The built app will be at:
```
src-tauri/target/release/bundle/macos/ollama-dash.app
src-tauri/target/release/bundle/dmg/ollama-dash_*_aarch64.dmg
```

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript + Tailwind CSS |
| Desktop shell | Tauri 2 (Rust) |
| LLM backend | Ollama REST API |
| Image backend | Custom FastAPI server (diffusers + PyTorch MPS) |
| State | Zustand (persisted) |

## License

MIT
