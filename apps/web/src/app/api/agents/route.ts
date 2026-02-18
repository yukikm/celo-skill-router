import { NextResponse } from "next/server";

import { listAgents, seedAgents } from "@tabless/core";

export async function GET() {
  // Ensure there is at least one agent for demo (seed only if empty).
  seedAgents([
    {
      id: "agent:worker:translator",
      name: "Polyglot Worker",
      skills: ["translate", "summarize"],
      address: "0x0000000000000000000000000000000000000000",
    },
    {
      id: "agent:worker:research",
      name: "Onchain Researcher",
      skills: ["onchain-research", "celoscan"],
      address: "0x0000000000000000000000000000000000000000",
    },
  ]);

  return NextResponse.json({ agents: listAgents() });
}
