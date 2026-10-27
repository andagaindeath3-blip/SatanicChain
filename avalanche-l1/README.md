# SatanicChain as Avalanche L1 (Subnet-EVM)

Follows [Avalanche Academy – Create Your Blockchain](https://build.avax.network/academy/avalanche-l1/customizing-evm/04-your-evm-blockchain/02-create-your-blockchain).

## Quick start

```bash
curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh -s
export PATH="$HOME/bin:$PATH"

cd avalanche-l1
./scripts/create.sh SatanicChain
./scripts/deploy.sh SatanicChain local
```

| Field | Value |
|-------|--------|
| Chain ID | **666** |
| Token | **SATAN** |
| VM | Subnet-EVM |
| Block time | ~2s |
| Warp / ICM | enabled in genesis |

## All networks

1. Run this L1 (native SATAN gas).
2. `npm run deploy:all` — same contracts on Ethereum, Base, BSC, Polygon, Avalanche C-Chain, …
3. dApp **BRIDGE** + relayer moves SATAN/SUSD between L1 and every EVM chain.

## Academy mapping

| Academy | This repo |
|---------|-----------|
| `avalanche blockchain create` | `./scripts/create.sh` |
| Subnet-EVM + test defaults | `genesis.json` |
| Token TOK / chain 9999 | **SATAN** / **666** |
| `avalanche blockchain deploy` Local | `./scripts/deploy.sh … local` |
