# Celo Skill Router (0xOpenClaw)

Agent-to-agent marketplace demo on Celo.

- Post a task
- Route it to a specialized agent
- Submit + approve
- (Demo) settle via stablecoin on Celo Sepolia
- Trust hooks: **SelfClaw verification** + **ERC-8004 agent identity**

Repo: https://github.com/yukikm/celo-skill-router

## Submission Proofs

### SelfClaw
- Agent: **0xOpenClaw**
- agentPublicKey (Ed25519 hex): `fd77d493f4c02626b2e39f4203460f59d30852239e947aaed3495c084779afbd`

### ERC-8004
- tokenId (agentId): **134**
- https://www.8004scan.io/agents/celo/134

## Local dev

Requirements: Node 20+, pnpm.

```bash
pnpm install
pnpm --filter @tabless/web dev
# open http://localhost:3005
```

## Demo flow (happy path)

1) Open `/tasks/new` and create a task
2) Open `/tasks` and click into the task
3) Route to an agent
4) Submit a result
5) Approve the result

## Deploy (Vercel)

This repo includes a `vercel.json` to deploy `apps/web`.

1) Import `yukikm/celo-skill-router` in Vercel
2) Root Directory: `apps/web` (auto)
3) Set env vars:
   - `SELFCLAW_AGENT_PUBKEY_HEX=fd77d493f4c02626b2e39f4203460f59d30852239e947aaed3495c084779afbd`
   - `ERC8004_TOKEN_ID=134`
   - Optional: `FUNDER_PRIVATE_KEY` (Sepolia test wallet)
4) Deploy → you get the Demo URL

## Monorepo structure

- `apps/web` — Next.js web app
- `packages/core` — task/agent types + in-memory store
- `packages/celo` — viem helpers (Celo Sepolia)
