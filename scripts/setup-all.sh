#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "==> Unify configs"
node scripts/unify.js
echo "==> Compile contracts"
npm run compile
echo "==> Done. Next: npm run l1 && npm run deploy:satanic && npm start"
