# SatanicChain L1 — Public Permissionless PoS (chainId 666)

**Модель:** Stake-weighted Proof-of-Stake (permissionless)  
**Консенсус-движок:** Clique + on-chain election  
**Блок:** 3 секунды  
**Gas limit:** 30 000 000  
**Нативная монета:** SATAN  
**Макс. активных валидаторов:** 21  

## Как это permissionless PoS

1. Любой может вызвать `registerValidator()` / `stake()`, отправив native SATAN (≥ 10 000).
2. `SatanicStaking` каждые ~100 блоков пересчитывает active set = топ-21 по стейку.
3. `ValidatorSet` + `pos-relayer` синхронизируют набор с geth через `clique.propose`.
4. Слэшинг 5%, jail 2 дня, unbonding 7 дней.

## Быстрый старт

```bash
cd l1
npm i ethers
node scripts/init.js
./scripts/up.sh
node scripts/status.js
```

RPC: `http://127.0.0.1:8545` · Chain ID **666** · Symbol **SATAN**

## Стать валидатором

```js
await staking.registerValidator(rewardAddr, 500, "Moniker", { value: parseEther("10000") });
```

## Relayer

```bash
STAKING_ADDRESS=0x... VALIDATOR_SET=0x... PRIVATE_KEY=0x... \
  node scripts/pos-relayer.js
```

## Параметры

| Параметр | Значение |
|----------|----------|
| Min stake | 10 000 SATAN |
| Max validators | 21 |
| Unbonding | 7 days |
| Slash | 5% |
| Jail | 2 days |

Текущая модель уже **публичная и permissionless**.
