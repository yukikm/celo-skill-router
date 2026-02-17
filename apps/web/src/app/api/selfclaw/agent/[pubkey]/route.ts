import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pubkey: string }> },
) {
  const { pubkey } = await params;

  // pubkey: raw 32-byte hex (64 chars) OR base64/PEM per SelfClaw.
  const url = `https://selfclaw.ai/api/selfclaw/v1/agent/${encodeURIComponent(pubkey)}`;

  const res = await fetch(url, {
    // Don't cache verification responses.
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
