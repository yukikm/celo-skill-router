import { NextResponse } from "next/server";

import { getTask } from "@tabless/core";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, task });
}
