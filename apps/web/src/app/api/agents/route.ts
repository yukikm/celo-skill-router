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
  ]);

  return NextResponse.json({ agents: listAgents() });
}
