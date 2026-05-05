#!/bin/bash
# One-time setup for the ollama-dash Stable Diffusion server.
# Installs a Python virtual environment and all required dependencies.
# The model (~2 GB) downloads automatically on first server start.
#
# Installs to: ~/.ollama-dash/stable-diffusion/
# To use an external drive, symlink after running this script:
#   ln -sf /Volumes/MyDrive/stable-diffusion ~/.ollama-dash/stable-diffusion

set -e

INSTALL_DIR="$HOME/.ollama-dash/stable-diffusion"

echo "=== ollama-dash — Stable Diffusion setup ==="
echo "Install directory: $INSTALL_DIR"
echo ""

# Detect Python 3.10–3.13
PYTHON=""
for cmd in python3.13 python3.12 python3.11 python3.10; do
  if command -v "$cmd" &>/dev/null; then
    PYTHON=$(command -v "$cmd")
    break
  fi
done
if [ -z "$PYTHON" ]; then
  echo "Error: Python 3.10–3.13 is required."
  echo "Install with: brew install python@3.13"
  exit 1
fi
echo "Using Python: $PYTHON ($($PYTHON --version))"
echo ""

# Copy server files
mkdir -p "$INSTALL_DIR"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/sd_server.py" "$INSTALL_DIR/sd_server.py"
cp "$SCRIPT_DIR/start.sh"    "$INSTALL_DIR/start.sh"
chmod +x "$INSTALL_DIR/start.sh"

VENV="$INSTALL_DIR/venv"

# Create virtual environment
echo "[1/3] Creating Python virtual environment..."
"$PYTHON" -m venv "$VENV"

# Install dependencies (transformers pinned to avoid import-scan bug on exFAT)
echo "[2/3] Installing PyTorch + Diffusers (may take several minutes)..."
"$VENV/bin/pip" install --upgrade pip --quiet
"$VENV/bin/pip" install \
  "torch" "torchvision" \
  "transformers==4.46.3" \
  "diffusers==0.31.0" \
  "accelerate>=0.26" \
  "fastapi>=0.110" "uvicorn[standard]" \
  "Pillow>=10" \
  --quiet

# Remove macOS AppleDouble metadata files that confuse transformers on exFAT
echo "[3/3] Cleaning macOS metadata files..."
find "$VENV" -name "._*" -delete 2>/dev/null

echo ""
echo "✓ Setup complete."
echo ""
echo "  The DreamShaper 8 model (~2 GB) will download automatically"
echo "  the first time the server starts (a few minutes, once only)."
echo ""
echo "  Open ollama-dash — the SD server starts automatically."
