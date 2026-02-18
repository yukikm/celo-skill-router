import { NextResponse } from "next/server";
import { z } from "zod";

import { upsertAgent } from "@tabless/core";

const RegisterAgentSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(2),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  skills: z.array(z.string().min(2)).min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RegisterAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const agent = upsertAgent({
    id: parsed.data.id,
    name: parsed.data.name,
    address: parsed.data.address as `0x${string}`,
    skills: parsed.data.skills,
  });

  return NextResponse.json({ ok: true, agent });
}
