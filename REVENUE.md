# Protocol revenue (honest model)

**Not a guaranteed money printer.** Income only when people use the network.

| Source | Fee | Goes to |
|--------|-----|--------|
| Create token | **0.00013666** native | Treasury → `0x1F51415288f00e50161882A7702D8511208B3Dd8` |
| DEX swap | 0.30% total | ~0.25% LPs · ~0.05% Treasury |

```bash
CREATE_FEE=0.00013666 \
FEE_RECIPIENT=0x1F51415288f00e50161882A7702D8511208B3Dd8 \
PRIVATE_KEY=0x… \
npm run deploy:factory:all
```

- **Owner:** create fees + protocol cut on every chain
- **LPs:** earn from pool volume
- **Validators:** staking rewards if L1 staking is live

More real usage → more fees. No infinite yield without users.
