# ollama-dashboard — User Manual

## Table of Contents

1. [What is ollama-dashboard?](#1-what-is-ollama-dashboard)
2. [Requirements](#2-requirements)
3. [Installation](#3-installation)
4. [First Launch](#4-first-launch)
5. [Interface Overview](#5-interface-overview)
6. [Starting a Chat](#6-starting-a-chat)
7. [Managing Models](#7-managing-models)
8. [Chat Settings](#8-chat-settings)
9. [Themes](#9-themes)
10. [Keyboard Shortcuts](#10-keyboard-shortcuts)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What is ollama-dashboard?

ollama-dashboard is a native macOS desktop app that lets you chat with AI language models running **entirely on your own machine** — no internet connection required, no data sent to external servers, no subscriptions.

It connects to [Ollama](https://ollama.com), a local AI runtime, and provides a clean chat interface with support for multiple models, per-chat settings, and markdown rendering.

---

## 2. Requirements

| Requirement | Details |
|---|---|
| **macOS** | 11 (Big Sur) or later |
| **Chip** | Apple Silicon (M1 / M2 / M3 / M4) |
| **Ollama** | Installed on your machine |
| **RAM** | 8 GB minimum, 16 GB+ recommended |
| **Disk** | Depends on the models you download (3–70 GB each) |

> **Intel Macs are not supported** by the pre-built release. You would need to build from source on an Intel machine.

---

## 3. Installation

### Step 1 — Install Ollama

Download and install Ollama from [ollama.com](https://ollama.com). It is the engine that runs the AI models locally.

### Step 2 — Download ollama-dashboard

Go to the [Releases page](https://github.com/aherreros-dev/ollama-dashboard/releases) and download the latest `.dmg` file.

### Step 3 — Install the app

1. Open the downloaded `.dmg` file
2. Drag `ollama-dash.app` to any folder (Desktop, Applications, an external drive, etc.)
3. Eject the DMG

### Step 4 — First launch (bypass Gatekeeper)

Because the app is not notarized with an Apple Developer certificate, macOS will block it on the first open.

**Option A — Right-click method (easiest):**
1. Right-click (or Control-click) the app icon
2. Select **Open**
3. Click **Open** in the dialog that appears
4. From now on, double-click works normally

**Option B — Terminal method:**
```bash
xattr -cr ~/path/to/ollama-dash.app
```
Replace the path with wherever you placed the app.

**Option C — System Settings:**
1. Try to open the app (it will be blocked)
2. Go to **System Settings → Privacy & Security**
3. Scroll down to find the blocked app notice
4. Click **Open Anyway**

---

## 4. First Launch

When you open ollama-dashboard for the first time:

1. **Ollama starts automatically** — if Ollama is not already running, the app will start it for you. This may take a few seconds.
2. **If you have no models installed**, the app will open directly in the **Models** view so you can download one.
3. **If you have models installed**, the app opens in the **Chat** view ready to use.

> If the app shows a red banner saying *"Cannot connect to Ollama"*, see the [Troubleshooting](#11-troubleshooting) section.

---

## 5. Interface Overview

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar │           Header                    Icons     │
│─────────│─────────────────────────────────────────────  │
│ + New   │  ollama-dash  [Model selector ▾]  🌙 💾 ≡    │
│  Chat   │─────────────────────────────────────────────  │
│─────────│                                               │
│ Chat 1  │           Chat area                           │
│ Chat 2  │                                               │
│ Chat 3  │                                               │
│         │                                               │
│─────────│─────────────────────────────────────────────  │
│ 1 model │  📎  [ Type a message...              ] [▶]  │
└─────────┴─────────────────────────────────────────────  │
```

### Sidebar (left)
- **New Chat button** — creates a new conversation
- **Chat list** — all your saved chats, sorted by most recent
- **Model count** — shows how many models are installed

### Header
- **Model selector** — dropdown to change which AI model the current chat uses
- **Theme button** (sun/moon/monitor icon) — switch between light, dark, and automatic theme
- **Models button** (database icon) — go to the Model Manager
- **Settings button** (sliders icon) — show/hide the settings panel for the current chat

### Chat area
- Messages appear here as a conversation
- The AI response streams in real time
- After each response, a metrics bar shows token count and generation speed

### Input bar
- **📎** — attach images (for multimodal models like LLaVA)
- **Text field** — type your message
- **Send button** — send the message
- **Stop button** — appears while the AI is generating; click to stop mid-response

---

## 6. Starting a Chat

### Creating a new chat
Click **+ New Chat** in the sidebar. A new conversation is created using the first available model.

### Sending a message
1. Click the text field at the bottom
2. Type your message
3. Press **Enter** to send, or **Shift+Enter** for a new line

### Switching models mid-chat
Use the **model selector** in the header to switch to a different model. The change applies to the next message you send.

### Attaching images
Click the **📎** icon to attach one or more images. This only works with multimodal models (e.g. `llava`, `gemma3`, `minicpm-v`). Regular text models will ignore images.

### Stopping a response
Click the red **■ Stop** button that appears while the AI is generating. The partial response is saved.

### Deleting a chat
Hover over a chat in the sidebar and click the **trash icon** that appears.

---

## 7. Managing Models

Click the **database icon** in the top-right to open the Model Manager.

### Downloading a model

1. Type the model name in the **Download model** field
2. Press Enter or click **Download**
3. A progress bar shows the download status
4. The model appears in the installed list when done

**Popular models to try:**

| Model | Size | Best for |
|---|---|---|
| `gemma3:1b` | ~800 MB | Fast responses, low RAM |
| `gemma3:4b` | ~3 GB | Good balance |
| `llama3.2:3b` | ~2 GB | General use |
| `llama3.1:8b` | ~5 GB | Better quality |
| `mistral:7b` | ~4 GB | Instruction following |
| `llava:7b` | ~5 GB | Images + text |
| `deepseek-r1:7b` | ~5 GB | Reasoning |
| `qwen2.5:7b` | ~5 GB | Multilingual |

Find all available models at [ollama.com/library](https://ollama.com/library).

### Deleting a model
Click the **trash icon** next to any installed model. You will be asked to confirm.

> Deleted models free up disk space immediately but must be re-downloaded to use again.

---

## 8. Chat Settings

Click the **sliders icon** (top-right) to open the settings panel for the current chat. Settings are saved per-chat.

### System Prompt
Text that is sent before every conversation to give the AI a persona or instructions.

**Examples:**
- `You are a concise assistant. Answer in bullet points.`
- `You are an expert Python developer. Explain things clearly.`
- `Respond only in Spanish.`

### Generation Parameters

| Setting | Default | What it does |
|---|---|---|
| **Temperature** | 0.7 | Creativity vs predictability. Higher = more creative, lower = more focused |
| **Top P** | 0.9 | Limits token selection to the top P probability mass. Lower = more conservative |
| **Top K** | 40 | Limits to top K most likely tokens at each step |
| **Context** | 4096 | How many tokens of conversation history the model can see |
| **Max tokens** | -1 | Maximum length of the response (-1 = unlimited) |
| **Repeat penalty** | 1.1 | Penalises repeating the same words. Higher = less repetition |
| **Seed** | 0 | Fixed seed for reproducible outputs (0 = random) |

**Recommended presets:**

| Use case | Temperature | Top P |
|---|---|---|
| Creative writing | 0.9–1.2 | 0.95 |
| Coding / technical | 0.2–0.4 | 0.9 |
| Summarisation | 0.3–0.5 | 0.9 |
| Chat / general | 0.7 | 0.9 |

---

## 9. Themes

Click the **theme button** in the header to cycle through:

| Icon | Mode | Description |
|---|---|---|
| 🖥 Monitor | **Automatic** | Follows your macOS appearance setting |
| ☀️ Sun | **Light** | Always light mode |
| 🌙 Moon | **Dark** | Always dark mode |

Your preference is saved and restored when you reopen the app.

---

## 10. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send message |
| `Shift + Enter` | New line in message |
| `Cmd + W` | Close window |
| `Cmd + Q` | Quit app |

---

## 11. Troubleshooting

### "Cannot connect to Ollama" banner

The app cannot reach Ollama at `http://localhost:11434`.

**Fix 1 — Start Ollama manually:**
```bash
ollama serve
```

**Fix 2 — Check if Ollama is already running:**
```bash
curl http://localhost:11434/api/tags
```
If you get a JSON response, Ollama is running. Try restarting the app.

**Fix 3 — Reinstall Ollama** from [ollama.com](https://ollama.com).

---

### "ollama-dash is damaged and can't be opened"

macOS Gatekeeper is blocking the app because it is not notarized.

**Fix:**
```bash
xattr -cr /path/to/ollama-dash.app
```
Then right-click → Open.

---

### The app opens but shows no models

You need to download at least one model.

1. Click the **database icon** in the top-right
2. Type a model name (e.g. `llama3.2:3b`) and click **Download**
3. Wait for the download to complete

---

### Responses are very slow

- **Normal on first message** — the model loads into RAM which takes 5–30 seconds depending on size.
- **Subsequent messages** are faster because the model stays loaded.
- If responses are consistently slow, try a smaller model (e.g. `gemma3:1b` instead of `llama3.1:8b`).

---

### The app crashes on launch

Run this in Terminal to see the error:
```bash
/path/to/ollama-dash.app/Contents/MacOS/ollama-dash
```

Common causes:
- **Ollama not installed** — install it from [ollama.com](https://ollama.com)
- **macOS too old** — requires macOS 11+

---

### High memory usage

Large models load entirely into RAM (and optionally GPU). This is expected behaviour.

- A 7B model uses ~5–6 GB RAM
- A 13B model uses ~9–10 GB RAM

If your Mac runs out of memory, use a smaller or more quantized model (e.g. `llama3.1:8b-instruct-q4_0`).

---

### Model download stuck or failed

1. Click the **refresh button** in the Model Manager
2. If the model appears as partially downloaded, delete it and try again
3. Check your internet connection
4. Some models are large (10–70 GB) — downloads can take a long time

---

### Chat history disappeared

Chat history is stored in the browser's `localStorage` inside the app. It persists between launches but can be lost if the app's data is cleared.

There is currently no export/import feature. This may be added in a future version.

---

### Cannot attach images

Image attachment only works with **multimodal models**. Make sure you are using a model that supports vision, such as:
- `llava:7b`
- `llava:13b`
- `gemma3:4b` (supports images)
- `minicpm-v`

Regular text models like `llama3` or `mistral` do not support images.

---

## Building from Source

If you want to build the app yourself (e.g. for Intel Macs):

```bash
# 1. Install dependencies
brew install node
npm install -g pnpm
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Clone the repo
git clone https://github.com/aherreros-dev/ollama-dashboard.git
cd ollama-dashboard

# 3. Install JS dependencies
pnpm install

# 4. Run in development mode
pnpm tauri dev

# 5. Build release app
pnpm tauri build
# Output: src-tauri/target/release/bundle/macos/ollama-dash.app
```

---

## Contributing

Issues and pull requests are welcome at [github.com/aherreros-dev/ollama-dashboard](https://github.com/aherreros-dev/ollama-dashboard).

## License

MIT — see [LICENSE](LICENSE)
