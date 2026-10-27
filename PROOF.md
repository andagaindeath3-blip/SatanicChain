# Доказательство распределения (локальный EVM, chainId 666)

Сеть: ganache (полная EVM), деплой скриптом `scripts/deploy.js`, тот же скрипт, что пойдёт в реальные сети.

- Получатель: `0x1F51415288f00e50161882A7702D8511208B3Dd8`
- `SatanicToken.balanceOf(получатель)` = **100000000.0 SATAN**
- `SatanicUSD.balanceOf(получатель)` = **50000000000.0 SUSD**
- `SatanicToken.valueUSD(получатель)` = 66 600 000 000.00 USD (666 USD × 100 млн)
- Все 13 проверок: см. `build/local-verification.json`, поле `allPass: true`

Контракты в этой прогонке:
- SatanicToken: 0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab
- SatanicUSD: 0x5b1869D9A4C187F2EAa108f3062412ecf0526b24
- SatanicVault: 0xCfEB869F69431e42cdB54A4F4f105C19C080A601

Адреса действительны только внутри того локального прогона: при реальном деплое адреса будут другими и появятся в `build/deployments.json`.
