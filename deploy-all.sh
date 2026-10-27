#!/usr/bin/env bash
# Деплой SatanicChain во все EVM-сети одним запуском.
# Нужен PRIVATE_KEY кошелька с газом в каждой сети (или только в нужных).
set -euo pipefail
: "${PRIVATE_KEY:?Задайте PRIVATE_KEY=0x... кошелька с газом}"
npm ci || npm install
node scripts/compile.js
node scripts/deploy.js all
node scripts/generate-tokenlist.js
