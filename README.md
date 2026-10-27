# SatanicChain

**Настоящий EVM L1 (chainId 666) + мультичейн контракты + dApp + Admin multi-deploy.**

## Что это

| Компонент | Описание |
|-----------|----------|
| **L1** (`l1/`) | Собственный блокчейн на geth + **Clique PoA**, 3 валидатора, блок 3 сек, native **SATAN** |
| **Contracts** | SATAN, SUSD, Vault (150% collateral), Swap, Bridge |
| **dApp** | Своп / мост / пул / кошелёк — 38 сетей + L1 |
| **Admin** | Деплой всех контрактов **одной кнопкой** во все выбранные сети через MetaMask |
| **Relayer** | Простой relayer для кросс-чейн моста |
| **Edge RPC** | Cloudflare Worker для публичного RPC |

## L1 — запуск настоящей сети

```bash
cd l1
npm i ethers
node scripts/init.js          # 3 валидатора + genesis
./scripts/up.sh               # Docker: 3 sealers + RPC
node scripts/status.js        # блок, peers, chainId
```

RPC: `http://127.0.0.1:8545`  
Chain ID: **666**  
Symbol: **SATAN**

Подробно: [`l1/README.md`](l1/README.md)

## Админка multi-deploy

```
/admin/
```

1. Подключи MetaMask  
2. Выбери сети (включая SatanicChain L1)  
3. Нажми **Деплой во все выбранные**  
4. Скачай `deployments.json`

## CLI-деплой

```bash
npm install
npm run compile
npm test
PRIVATE_KEY=0x... npm run deploy:all
```

## Токены

| Токен | Символ | Ориентир | Cap |
|-------|--------|----------|-----|
| Satanic Token | SATAN | 666 USD | 666 666 666 |
| Satanic USD | SUSD | 1 USD | 666 666 666 666 |

Vault: залог 150% → mint SUSD.

## Структура

```
SatanicChain/
├── l1/                 # настоящий блокчейн (geth Clique)
├── contracts/          # Solidity
├── admin/              # multi-deploy UI
├── dapp/               # пользовательский интерфейс
├── scripts/            # compile / deploy / test
├── relayer/
├── chain/              # Cloudflare Worker RPC
└── vercel.json
```

## Лицензия

MIT
