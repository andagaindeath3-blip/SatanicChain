# SatanicChain L1 — настоящий блокчейн (chainId 666)

**Consensus:** Clique PoA (Proof-of-Authority)  
**Блок:** 3 секунды  
**Gas limit:** 30 000 000  
**Нативная монета:** SATAN (18 decimals)  
**Hardforks:** London + Shanghai + Cancun с genesis  

## Архитектура

| Сервис | Порт | Роль |
|--------|------|------|
| node1  | 8545 / 30303 | Sealer + основной RPC |
| node2  | 8555 / 30304 | Sealer |
| node3  | 8565 / 30305 | Sealer |
| rpc    | 8575         | Read-only gateway (отдавать наружу) |

3 валидатора по умолчанию → сеть переживает падение 1 ноды.

## Быстрый старт (VPS: 4 vCPU / 8 GB RAM / 100 GB SSD)

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 nodejs npm
cd l1
npm i ethers
node scripts/init.js
node verify-genesis.js
./scripts/up.sh
node scripts/status.js
```

RPC: `http://127.0.0.1:8545`  
Chain ID: **666**  
Symbol: **SATAN**

## Добавить сеть в MetaMask

| Поле | Значение |
|------|----------|
| Network name | SatanicChain |
| RPC URL | `http://ВАШ_IP:8545` |
| Chain ID | **666** |
| Currency symbol | **SATAN** |

## Публичный RPC

Caddy / Nginx / Cloudflare Worker (`chain/worker.js`).

## Важно

- Это **PoA**, не публичный PoS. Безопасность = доверие к валидаторам.
- Бэкапьте `secrets/` и `data/`.
- Минимум 3 валидатора для устойчивости.
