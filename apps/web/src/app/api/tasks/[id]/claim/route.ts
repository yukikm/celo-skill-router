import { NextResponse } from "next/server";
import { z } from "zod";

import { getAgent, getTask, updateTask } from "@tabless/core";

const ClaimSchema = z.object({
  agentId: z.string().min(3),
});

/**
 * Worker agent claims (accepts) a task.
 * This is the worker-initiated counterpart to route-to-agent.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });

  if (task.status !== "OPEN") {
    return NextResponse.json(
      { ok: false, error: `Task is ${task.status}, not OPEN. Only OPEN tasks can be claimed.` },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const agent = getAgent(parsed.data.agentId);
  if (!agent) {
    return NextResponse.json(
      { ok: false, error: `Agent ${parsed.data.agentId} not found. Register first via POST /api/agents/register.` },
      { status: 400 },
    );
  }

  if (!agent.skills.includes(task.skill)) {
    return NextResponse.json(
      { ok: false, error: `Agent does not have skill "${task.skill}". Agent skills: ${agent.skills.join(", ")}` },
      { status: 400 },
    );
  }

  const updated = updateTask(id, {
    status: "ROUTED",
    workerAgentId: agent.id,
  });

  return NextResponse.json({ ok: true, task: updated, claimedBy: agent });
}
