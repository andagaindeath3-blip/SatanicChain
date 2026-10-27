# Token creation & DEX

| Feature | Contract |
|---------|----------|
| Create ERC-20 coin | TokenFactory + UserToken |
| Swap user tokens | TokenDEX (0.30% fee AMM) |
| Deploy on all chains | MultiChainFactoryBootstrap + `npm run deploy:factory:all` |

```bash
npm run compile
PRIVATE_KEY=0x… npm run deploy:factory
PRIVATE_KEY=0x… npm run deploy:factory:all
```

Created tokens are standard ERC-20 contracts on the EVM — they appear on explorers and in wallets.
