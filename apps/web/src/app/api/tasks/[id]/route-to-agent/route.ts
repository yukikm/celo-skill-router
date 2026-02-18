import { NextResponse } from "next/server";

import { getTask, listAgents, seedAgents, updateTask } from "@tabless/core";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ ok: false }, { status: 404 });

  // If no agents are registered yet, seed defaults with the platform wallet.
  seedAgents([
    {
      id: "agent:worker:translator",
      name: "Polyglot Worker",
      skills: ["translate", "summarize", "writing"],
      address: "0xEE8b59794Ee3A6aeeCE9aa09a118bB6ba1029e3c",
    },
    {
      id: "agent:worker:research",
      name: "Onchain Researcher",
      skills: ["onchain-research", "celoscan", "data-analysis"],
      address: "0xEE8b59794Ee3A6aeeCE9aa09a118bB6ba1029e3c",
    },
  ]);

  const agents = listAgents();
  const match = agents.find((a) => a.skills.includes(task.skill)) ?? agents[0];
  if (!match) {
    return NextResponse.json(
      { ok: false, error: "No agents available" },
      { status: 400 },
    );
  }

  const updated = updateTask(id, {
    status: "ROUTED",
    workerAgentId: match.id,
  });

  return NextResponse.json({ ok: true, task: updated, routedTo: match });
}
