import { NextResponse } from "next/server";
import { z } from "zod";

import { getTask, updateTask } from "@tabless/core";

const SubmitSchema = z.object({
  output: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ ok: false }, { status: 404 });

  const parsed = SubmitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = updateTask(id, {
    status: "SUBMITTED",
    // store output in description for MVP
    description: `${task.description}\n\n---\nSUBMISSION:\n${parsed.data.output}`,
  });

  return NextResponse.json({ ok: true, task: updated });
}
