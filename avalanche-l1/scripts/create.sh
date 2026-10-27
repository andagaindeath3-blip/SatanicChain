#!/usr/bin/env bash
set -euo pipefail
NAME="${1:-SatanicChain}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if ! command -v avalanche >/dev/null 2>&1; then
  echo "Install Avalanche-CLI:"
  echo "  curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh -s"
  exit 1
fi
echo "==> Creating $NAME (Subnet-EVM)"
avalanche blockchain create "$NAME" --sovereign=false 2>/dev/null || avalanche blockchain create "$NAME" || true
DEST="$HOME/.avalanche-cli/subnets/$NAME"
mkdir -p "$DEST"
cp -f "$ROOT/genesis.json" "$DEST/genesis.json"
cp -f "$ROOT/sidecar.json" "$DEST/sidecar.json" 2>/dev/null || true
echo "==> genesis -> $DEST/genesis.json"
avalanche blockchain describe "$NAME" || true
echo "Next: ./scripts/deploy.sh local"
