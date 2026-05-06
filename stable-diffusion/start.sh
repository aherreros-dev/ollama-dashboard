#!/bin/bash
# Starts the Stable Diffusion server.
# Called automatically by ollama-dash on launch.

SD_DIR="$HOME/.ollama-dash/stable-diffusion"

# macOS creates ._* metadata files on exFAT volumes; transformers/diffusers
# tries to parse them as Python — remove before starting.
find "$SD_DIR/venv"   -name "._*" -delete 2>/dev/null
find "$SD_DIR/models" -name "._*" -delete 2>/dev/null

export HF_HOME="$SD_DIR/models"
export HF_HUB_DISABLE_SYMLINKS_WARNING=1
# MPS fallback: lets PyTorch run unsupported float16 attention ops on CPU,
# preventing the NaN / black-image bug on Apple Silicon.
export PYTORCH_ENABLE_MPS_FALLBACK=1

cd "$SD_DIR"
exec "$SD_DIR/venv/bin/python" "$SD_DIR/sd_server.py"
