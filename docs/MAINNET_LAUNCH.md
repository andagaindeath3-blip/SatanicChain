# SatanicChain — Mainnet launch checklist

Treasury: `0x1F51415288f00e50161882A7702D8511208B3Dd8`  
Create fee: `0.00013666` · Chain ID: `666`

## Phase 1 — Public L1
- [ ] VPS + Docker
- [ ] `production/docker compose up -d`
- [ ] DNS + TLS for RPC
- [ ] Public `eth_chainId` = `0x29a`
- [ ] 3+ validators

## Phase 2 — Global contracts
- [ ] `npm run compile`
- [ ] `PRIVATE_KEY=… npm run deploy:global`
- [ ] Fill `dapp/config.js` deployments

## Phase 3 — Bridge + relayer
- [ ] `relayer/.env` bridges + keys
- [ ] `npm run relayer`
- [ ] Test L1 ↔ Base transfer

## Phase 4 — World liquidity
- [ ] Token on Base via factory
- [ ] Uniswap pool (see UNISWAP_LIQUIDITY.md)

## Phase 5 — Product
- [ ] Host dApp (Vercel)
- [ ] Reown projectId
- [ ] MetaMask: RPC, chainId 666, SATAN

## Phase 6 — Trust
- [ ] Multisig treasury
- [ ] Publish addresses
- [ ] No keys in git
