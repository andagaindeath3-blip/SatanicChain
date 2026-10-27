# SatanicChain

**Public permissionless PoS EVM L1 (chainId 666) + multi-chain contracts + dApp + Admin.**

## Модель консенсуса

**Stake-weighted Proof-of-Stake (permissionless)**

- Любой может застейкать native **SATAN** и стать валидатором (мин. 10 000 SATAN).
- Активный набор = **топ-21** по стейку, пересчитывается on-chain.
- Unbonding 7 дней, слэшинг 5%, jail 2 дня.
- Движок блоков: geth Clique, набор подписантов синхронизируется из стейкинг-контракта.

Подробно: [`l1/README.md`](l1/README.md)

## Быстрый старт L1

```bash
cd l1
npm i ethers
node scripts/init.js
./scripts/up.sh
node scripts/status.js
```

RPC `http://127.0.0.1:8545` · Chain ID **666** · Symbol **SATAN**

## Контракты

| Контракт | Назначение |
|----------|------------|
| `SatanicToken` | ERC-20 SATAN (ориентир 666 USD) |
| `SatanicUSD` | SUSD стейблкоин |
| `SatanicVault` | CDP 150% collateral |
| `SatanicSwap` | Фиксированный своп |
| `SatanicBridge` | Кросс-чейн мост |
| **`SatanicStaking`** | **Permissionless PoS стейкинг** |
| **`ValidatorSet`** | **Синхронизация active set → clique** |

## Админка multi-deploy

`/admin/` — подключи MetaMask → выбери сети (включая L1 666) → деплой всех контрактов одной кнопкой.

## Стать валидатором

```js
staking.registerValidator(rewardAddr, 500, "Moniker", { value: parseEther("10000") })
```

## Структура

```
SatanicChain/
├── l1/                  # PoS L1 (geth + staking sync)
│   ├── scripts/init.js
│   ├── scripts/up.sh
│   ├── scripts/pos-relayer.js
│   └── docker-compose.yml
├── contracts/           # Solidity (включая SatanicStaking, ValidatorSet)
├── admin/               # multi-chain deploy UI
├── dapp/                # swap / bridge / wallet
├── scripts/             # compile, deploy, test
├── relayer/
└── chain/               # Cloudflare Worker RPC
```

## Лицензия

MIT
