#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ init validators & genesis"
if [ ! -f genesis.json ] || [ ! -f validators.json ]; then
  node scripts/init.js
fi
node verify-genesis.js || true

echo "→ import keys into keystores"
mkdir -p secrets
for i in 0 1 2 3 4 5 6; do
  KEY=secrets/validator-$i.key
  if [ -f "$KEY" ]; then
    DATADIR=data/node$((i+1))
    mkdir -p "$DATADIR"
    if [ ! -d "$DATADIR/keystore" ] || [ -z "$(ls -A $DATADIR/keystore 2>/dev/null)" ]; then
      echo "  import validator-$i → $DATADIR"
      docker run --rm -v "$(pwd)/$DATADIR:/data" -v "$(pwd)/secrets:/secrets:ro" \
        ethereum/client-go:v1.14.12 \
        account import --datadir=/data --password=/secrets/password.txt /secrets/validator-$i.key 2>/dev/null || true
    fi
  fi
done

echo "→ docker compose up"
docker compose up -d

echo "→ waiting RPC :8545…"
for i in $(seq 1 40); do
  sleep 2
  ID=$(curl -s -m 3 -X POST http://127.0.0.1:8545 \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' 2>/dev/null \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('result',''))" 2>/dev/null || true)
  if [ "$ID" = "0x29a" ]; then
    echo "  chainId = 666 (0x29a) ✓"
    break
  fi
  printf "."
done
echo
node scripts/status.js 2>/dev/null || true
echo "RPC: http://127.0.0.1:8545"
