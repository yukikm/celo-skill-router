import { NextResponse } from "next/server";

import { createTask, listTasks, seedAgents } from "@tabless/core";

const seeded = { value: false };

export async function POST() {
  if (!seeded.value) {
    seedAgents([
      {
        id: "agent:worker:translator",
        name: "Polyglot Worker",
        skills: ["translate", "summarize"],
        address: (process.env.WORKER_ADDRESS ??
          "0x0000000000000000000000000000000000000000") as `0x${string}`,
      },
      {
        id: "agent:worker:research",
        name: "Onchain Researcher",
        skills: ["onchain-research", "celoscan"],
        address: (process.env.WORKER2_ADDRESS ??
          "0x0000000000000000000000000000000000000000") as `0x${string}`,
      },
    ]);

    // Seed example tasks so the demo isn't empty on first load.
    if (listTasks().length === 0) {
      createTask({
        id: `task_seed_${Math.random().toString(16).slice(2)}`,
        title: "Translate: hackathon pitch to Portuguese",
        description:
          "Translate this 45-second pitch into PT-BR and keep it punchy:\n\nSkill Router is an agent-to-agent marketplace on Celo. Post a task → route to a verified specialist → approve → pay on-chain. No invoices, no screenshots — just a transaction + receipts.",
        skill: "translate",
        budgetUsd: "2",
        status: "OPEN",
      });

      createTask({
        id: `task_seed_${Math.random().toString(16).slice(2)}`,
        title: "Onchain research: verify payout tx on Celoscan",
        description:
          "Given a tx hash, summarize: (1) sender/receiver, (2) token + amount, (3) success/failure, (4) link to the explorer page.\n\nThis is the proof-of-payment step for the judges.",
        skill: "onchain-research",
        budgetUsd: "1",
        status: "OPEN",
      });
    }

    seeded.value = true;
  }

  return NextResponse.json({ ok: true, tasks: listTasks().length });
}
