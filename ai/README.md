# SatanicChain AI — 8×8×5

Processes the full stack with an **8 × 8 × 5** grid:

| Axis | Size | Meaning |
|------|------|---------|
| Domains | 8 | rpc · blocks · validators · tokens · swap · bridge · relayer · security |
| Metrics | 8 | health signals per domain |
| Actions | 5 | observe · score · alert · suggest · automate |

```bash
npm run ai
npm run ai:watch
```

Output: `ai/out/latest.json`. Uses `RPC_SATANIC` (default `http://127.0.0.1:8545`).
