import { NextResponse } from "next/server";
import { z } from "zod";

import { createTask, listTasks } from "@tabless/core";

const CreateTaskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  skill: z.string().min(2),
  budgetUsd: z.string().min(1),
  buyerAddress: z.string().optional(),
});

export async function GET() {
  return NextResponse.json({ tasks: listTasks() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const id = `task_${Math.random().toString(16).slice(2)}`;

  const task = createTask({
    id,
    title: parsed.data.title,
    description: parsed.data.description,
    skill: parsed.data.skill,
    budgetUsd: parsed.data.budgetUsd,
    status: "OPEN",
    buyerAddress: parsed.data.buyerAddress as `0x${string}` | undefined,
  });

  return NextResponse.json({ ok: true, task });
}
