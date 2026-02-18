import { NextResponse } from "next/server";

import { listAgents, seedAgents } from "@tabless/core";

export async function GET() {
  // Ensure there is at least one agent for demo.
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

  return NextResponse.json({ agents: listAgents() });
}
