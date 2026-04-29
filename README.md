# ollama-dashboard

A native macOS desktop app for chatting with your local [Ollama](https://ollama.com) models. Built with Tauri + React.

## Features

- Chat with any locally installed Ollama model
- Streaming responses with token metrics
- Per-chat settings: temperature, top-p, top-k, context length, repeat penalty, seed
- System prompt per chat
- Download and delete models from within the app
- Ollama starts automatically when the app opens
- Persistent chat history

## Download

Head to [Releases](https://github.com/aherreros-dev/ollama-dashboard/releases) and download the latest `.dmg` (Apple Silicon).

Open the DMG, drag the app anywhere, and double-click to launch.

> **First launch:** macOS may show a security warning because the app is not notarized. Go to **System Settings → Privacy & Security → Open Anyway**.

## Prerequisites

- macOS 11 or later (Apple Silicon)
- [Ollama](https://ollama.com) installed

The app will start Ollama automatically if it is not already running.

## Build from source

### Requirements

- [Node.js](https://nodejs.org) + [pnpm](https://pnpm.io)
- [Rust](https://rustup.rs)

### Steps

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build release .app and .dmg
pnpm tauri build
```

The built app will be at `src-tauri/target/release/bundle/macos/ollama-dashboard.app`.

## License

MIT
