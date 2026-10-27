# SatanicChain — L1 как BNB Chain (PoSA)

**Consensus:** Proof of Staked Authority (PoSA) — как BNB Smart Chain  
**Engine:** geth Clique + SystemStaking (top-21)  
**Chain ID:** 666  
**Block time:** **1 second**  
**Gas limit:** 60 000 000  
**Gas token:** **SATAN**  
**Max validators:** **21**

## vs BNB Chain

| | BSC | SatanicChain |
|--|-----|--------------|
| Consensus | Parlia (PoSA) | Clique + SystemStaking (PoSA) |
| Max validators | 21 | 21 |
| Block time | ~0.75s | 1s |
| Gas token | BNB | SATAN |
| Election | stake-weighted | stake-weighted top-21 |

## Start

```bash
cd l1
npm i ethers
node scripts/init.js
./scripts/up.sh
node scripts/status.js
```

RPC `http://127.0.0.1:8545` · Chain ID **666** · Symbol **SATAN**

## Become validator

```js
await staking.createValidator(feeAddr, 500, "Name", { value: parseEther("10000") });
await staking.delegate(operator, { value: parseEther("1000") });
```

## System contracts

| Address | Contract |
|---------|----------|
| `0x0000…1000` | SystemStaking |
| `0x0000…1001` | SystemSlash (reserved) |

## Params

Min self-stake 10_000 SATAN · Unbonding 7d · Slash 5% · Jail 2d · Epoch 200 blocks
