# SatanicChain

**EVM L1 · chainId 666 · gas token SATAN · multi-chain dApp**

One config drives everything: `config/chain.json` → `npm run unify`.

## Quick start

```bash
npm install
npm run setup
npm run l1
npm run rpc:check
# .env: PRIVATE_KEY=0x...
npm run deploy:satanic
npm run deploy:all
npm run dapp:config
npm start
npm run relayer
```

## MetaMask

| Field | Value |
|-------|--------|
| RPC | `http://127.0.0.1:8545` |
| Chain ID | **666** |
| Symbol | **SATAN** |

## Commands

| Command | Action |
|---------|--------|
| `npm run unify` | Regenerate all from `config/chain.json` |
| `npm run setup` | unify + compile |
| `npm run l1` | Start geth L1 |
| `npm run deploy:all` | Deploy on all chains |
| `npm start` | Serve dApp |
| `npm run relayer` | Bridge relayer |
