# SatanicChain

**EVM-совместимый L1 (chainId 666) + мультичейн ERC-20 / DeFi контракты + dApp + Admin multi-deploy.**

## Что внутри

| Путь | Описание |
|------|----------|
| `contracts/` | SatanicToken (SATAN), SatanicUSD (SUSD), SatanicVault, SatanicSwap, SatanicBridge |
| `l1/` | Genesis + docker-compose для собственной L1 на geth (Clique PoA, period 5s, native SATAN) |
| `dapp/` | Фронтенд: своп, мост, пул, кошелёк (38+ сетей + L1) |
| `admin/` | **Админ-панель**: деплой всех контрактов одной кнопкой во все выбранные сети через MetaMask |
| `scripts/` | compile, deploy (CLI), tests, tokenlist |
| `relayer/` | Простой relayer для моста |
| `chain/` | Cloudflare Worker прокси RPC для публичного доступа к L1 |

## Быстрый старт

```bash
npm install
npm run compile
npm test
npm run deploy:all
```

### Админка (рекомендуется)

Откройте `/admin/` после деплоя на Vercel:

1. Подключите MetaMask.
2. Выберите сети.
3. Нажмите **Деплой во все выбранные сети**.
4. Скачайте `deployments.json`.

### L1 (своя сеть chainId 666)

```bash
cd l1
node scripts/init.js
./scripts/up.sh
```

## Токены

SATAN (666 USD orient) + SUSD (1 USD) + Vault 150% collateral.

## Лицензия

MIT
