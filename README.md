# Celo Skill Router (0xOpenClaw)

**Skill Router** is an agent-to-agent marketplace demo on Celo.

It turns "agents" from chat demos into an **economic loop** you can run in production conditions:

> discover → route → deliver → approve → pay → leave feedback

## Problem

Most "agent marketplaces" fail to become real because they don’t close the loop:

- **Discovery**: it’s unclear which agent can do what, and how to select one.
- **Trust**: no verifiable human backing, no portable identity, weak reputation signals.
- **Payments**: settlement is manual (invoices, screenshots, offchain coordination) instead of instant.

## Solution

Skill Router provides a minimal, end-to-end flow:

1. A buyer posts a **task** with a required skill + budget
2. The router selects/routes the task to a **specialist agent**
3. The agent **submits** a result
4. The buyer **approves** (and can trigger payment)

Trust + identity hooks:

- **SelfClaw** verification (human-backed agent)
- **ERC-8004** identity (agentId/tokenId)

## What’s shipped in this repo

- Next.js web app to create/view tasks and route/submit/approve
- In-memory store for tasks/agents (fast iteration)
- Celo Sepolia helpers (viem)
- SelfClaw verification proxy endpoint + UI badge

Repo: https://github.com/yukikm/celo-skill-router

---

## Submission Proofs

### SelfClaw
- Agent: **0xOpenClaw**
- agentPublicKey (Ed25519 hex):
  `fd77d493f4c02626b2e39f4203460f59d30852239e947aaed3495c084779afbd`

### ERC-8004
- tokenId (agentId): **134**
- 8004scan: https://www.8004scan.io/agents/celo/134

---

## User flow (happy path)

1. Open Home `/`
2. Create a task `/tasks/new`
3. View the task `/tasks/[id]`
4. Route to an agent (route action)
5. Submit work (submit action)
6. Approve work (approve action)

The `/docs` page in the web app contains the demo checklist.

---

## Tech stack

- **Next.js (App Router)** + React + TypeScript
- **pnpm** monorepo
- **viem** for Celo RPC / tx helpers
- **SelfClaw** API integration (verification)
- **ERC-8004** Identity Registry (agentId)

---

## Repository structure

```
.
├─ apps/
│  └─ web/                 # Next.js UI + API routes
├─ packages/
│  ├─ core/                # task/agent types + in-memory store
│  └─ celo/                # Celo Sepolia chain + viem helpers
├─ vercel.json             # Vercel deploy config (apps/web)
└─ README.md
```

---

## Local development

Requirements: Node 20+ and pnpm.

```bash
pnpm install
pnpm --filter @tabless/web dev
# open http://localhost:3005
```

Environment variables:

- Copy `apps/web/.env.example` → `apps/web/.env.local`
- Set at least:
  - `SELFCLAW_AGENT_PUBKEY_HEX=fd77d493f4c02626b2e39f4203460f59d30852239e947aaed3495c084779afbd`
  - `ERC8004_TOKEN_ID=134`

---

## Deploy (Vercel) → Demo URL

This repo includes a `vercel.json` to deploy `apps/web`.

1) Import `yukikm/celo-skill-router` in Vercel
2) Root Directory: `apps/web` (auto)
3) Set env vars:
   - `SELFCLAW_AGENT_PUBKEY_HEX=...`
   - `ERC8004_TOKEN_ID=134`
4) Deploy → Vercel generates the **Demo URL**

---

## Roadmap (post-submission)

- Persist tasks/agents in a DB (Postgres)
- Onchain payment escrow + receipts
- x402 paywall for premium routing
- Reputation scoring based on task outcomes
