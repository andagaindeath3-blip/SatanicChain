# Production L1 (public RPC)

```bash
cd production
cp .env.example .env
# set VALIDATOR_1 + secrets
docker compose up -d
curl -s http://127.0.0.1/health
```

DNS → VPS. TLS: put certs in `nginx/certs/`. Do not expose unlocked validator ports.
