# Global exchange (Uniswap / Pancake)

1. `PRIVATE_KEY=… npm run deploy:global -- --only base`
2. Create token (dApp CREATE or factory)
3. Uniswap on Base: pool token + WETH/USDC
4. Optional: Pancake BSC, Uniswap Ethereum
5. Bridge: deploy SatanicBridge both sides + `npm run relayer`

Native SATAN needs wrap+bridge for EVM DEX listings.
