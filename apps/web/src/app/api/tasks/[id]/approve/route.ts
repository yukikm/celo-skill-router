import { NextResponse } from "next/server";

import { getAgent, getTask, updateTask } from "@tabless/core";
import { CELO_SEPOLIA_USDM, erc20Transfer } from "@tabless/celo";

// This endpoint simulates the router agent releasing escrow to the worker.
// For hackathon MVP, we pay from ROUTER_PRIVATE_KEY directly.

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ ok: false }, { status: 404 });
  if (!task.workerAgentId) {
    return NextResponse.json(
      { ok: false, error: "Task not routed" },
      { status: 400 },
    );
  }

  const worker = getAgent(task.workerAgentId);
  if (!worker) {
    return NextResponse.json(
      { ok: false, error: "Worker not found" },
      { status: 400 },
    );
  }

  const pk = process.env.ROUTER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing ROUTER_PRIVATE_KEY env var (router agent wallet) to pay worker.",
      },
      { status: 500 },
    );
  }

  // MVP: interpret budgetUsd as a whole-number USDm amount.
  // You can set budgets like "1" or "5" for demo.
  const amountUnits = BigInt(Math.max(1, Number(task.budgetUsd || "1")));
  const amount = amountUnits * 10n ** 18n;

  const hash = await erc20Transfer({
    token: CELO_SEPOLIA_USDM,
    fromPrivateKey: pk,
    to: worker.address,
    amount,
  });

  const updated = updateTask(id, {
    status: "APPROVED",
    payoutTxHash: hash,
  });

  return NextResponse.json({ ok: true, task: updated, payoutTxHash: hash });
}
