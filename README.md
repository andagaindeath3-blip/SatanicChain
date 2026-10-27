# SatanicChain

**EVM L1 как BNB Chain — PoSA, 21 валидатор, блок 1 сек, native SATAN.**

## Модель (BNB Chain style)

| | |
|--|--|
| Consensus | **PoSA** (Proof of Staked Authority) |
| Engine | geth Clique + `SystemStaking` election |
| Validators | **max 21**, top by stake |
| Block time | **1 second** |
| Gas limit | 60 000 000 |
| Gas token | **SATAN** |
| Chain ID | **666** |

Как BSC: быстрый EVM, ограниченный набор валидаторов, выбираемых стейком, permissionless вход через `createValidator`.

## Запуск L1

```bash
cd l1
npm i ethers
node scripts/init.js
./scripts/up.sh
node scripts/status.js
```

## Стать валидатором

```js
staking.createValidator(feeAddr, 500, "Moniker", { value: parseEther("10000") })
```

## Контракты

| Contract | Role |
|----------|------|
| **SystemStaking** | PoSA staking / election (BSC-like) |
| SatanicToken | ERC-20 SATAN |
| SatanicUSD | SUSD |
| SatanicVault | CDP |
| SatanicSwap / Bridge | DeFi + bridge |

## Admin multi-deploy

`/admin/` — деплой во все сети одной кнопкой.

## License

MIT
