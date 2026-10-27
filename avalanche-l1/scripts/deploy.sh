#!/usr/bin/env bash
set -euo pipefail
NAME="${1:-SatanicChain}"
NETWORK="${2:-local}"
if ! command -v avalanche >/dev/null 2>&1; then
  echo "Install Avalanche-CLI first"; exit 1
fi
case "$NETWORK" in
  local|Local) avalanche blockchain deploy "$NAME" --local ;;
  fuji|Fuji|testnet) avalanche blockchain deploy "$NAME" --fuji ;;
  mainnet|Mainnet) avalanche blockchain deploy "$NAME" --mainnet ;;
  *) echo "Usage: $0 [name] [local|fuji|mainnet]"; exit 1 ;;
esac
echo "RPC: http://127.0.0.1:9650/ext/bc/<BlockchainID>/rpc"
echo "MetaMask: Chain ID 666, Symbol SATAN"
