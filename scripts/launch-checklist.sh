#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "=== SatanicChain launch ==="
echo "1) production: docker compose up -d"
echo "2) compile + PRIVATE_KEY=0x… npm run deploy:global"
echo "3) npm run relayer"
echo "4) docs/MAINNET_LAUNCH.md"
echo "Treasury: 0x1F51415288f00e50161882A7702D8511208B3Dd8"
echo "Fee: 0.00013666"
