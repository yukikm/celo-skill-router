import { NextResponse } from "next/server";

import { seedAgents } from "@tabless/core";

const seeded = { value: false };

export async function POST() {
  if (!seeded.value) {
    seedAgents([
      {
        id: "agent:worker:translator",
        name: "Polyglot Worker",
        skills: ["translate", "summarize"],
        address: (process.env.WORKER_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
      },
      {
        id: "agent:worker:research",
        name: "Onchain Researcher",
        skills: ["onchain-research", "celoscan"],
        address: (process.env.WORKER2_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
      },
    ]);
    seeded.value = true;
  }

  return NextResponse.json({ ok: true });
}
