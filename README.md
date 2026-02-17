# Tabless (Celo)

Reputation-backed IOUs + pay-by-link settlements on Celo stablecoins.

## Goal (hackathon MVP)
- Telegram-first split bill / IOU agent
- Settle via Celo stablecoins (Sepolia first)
- ERC-8004 agent identity + reputation hooks
- SelfClaw verification for submission

## Structure (planned)
- `apps/bot` — Telegram bot (grammY)
- `packages/core` — split/IOU ledger + intent parsing + settlement builder
- `packages/celo` — viem clients + token/tx helpers (Celo + Celo Sepolia)

## Dev
TBD (scaffold in progress)
