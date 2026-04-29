#!/bin/bash
set -e

echo "=== Setting up Ollama for ollama-dash ==="

# Create LaunchAgent plist for environment variables
PLIST="$HOME/Library/LaunchAgents/dev.local.ollama-env.plist"

cat > "$PLIST" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>dev.local.ollama-env</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/launchctl</string>
        <string>setenv</string>
        <string>OLLAMA_ORIGINS</string>
        <string>*</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

# Unload existing plist (ignore errors)
launchctl unload "$PLIST" 2>/dev/null || true

# Load the plist
launchctl load "$PLIST"

# Set environment variables in current session
export OLLAMA_ORIGINS="*"
export OLLAMA_HOST="127.0.0.1:11434"

echo "Environment variables set:"
echo "  OLLAMA_ORIGINS=$OLLAMA_ORIGINS"
echo "  OLLAMA_HOST=$OLLAMA_HOST"

# Restart Ollama service via Homebrew
echo "Restarting Ollama service..."
brew services restart ollama

# Wait a moment for Ollama to start
sleep 2

# Verify connection
echo "Verifying Ollama connection..."
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "✓ Ollama is running at http://127.0.0.1:11434"
    echo ""
    echo "Available models:"
    curl -s http://127.0.0.1:11434/api/tags | python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(m['name'] for m in d.get('models',[])))" 2>/dev/null || echo "  (run 'ollama list' to see models)"
else
    echo "✗ Could not connect to Ollama"
    echo "  Try running: ollama serve"
    exit 1
fi

echo ""
echo "=== Setup complete ==="
echo "Run 'pnpm tauri dev' to start ollama-dash"