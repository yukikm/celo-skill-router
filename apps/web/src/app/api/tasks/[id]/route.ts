import { NextResponse } from "next/server";

import { getAgent, getTask } from "@tabless/core";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ ok: false }, { status: 404 });

  const worker = task.workerAgentId ? getAgent(task.workerAgentId) : null;

  return NextResponse.json({ ok: true, task, worker });
}
