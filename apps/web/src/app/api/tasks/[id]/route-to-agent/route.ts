import { NextResponse } from "next/server";

import { getTask, listAgents, seedAgents, updateTask } from "@tabless/core";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ ok: false }, { status: 404 });

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
