import { NextResponse } from "next/server";

import { getAgent, getTask, updateTask } from "@tabless/core";
import { CELO_SEPOLIA_USDM, erc20BalanceOf, makePublicClient } from "@tabless/celo";

// After Approve + pay, the transfer may take a moment to finalize.
// This endpoint lets the UI refresh on-chain balances and (best-effort) confirm the tx.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ ok: false }, { status: 404 });

  if (!task.payoutTxHash) {
    return NextResponse.json(
      { ok: false, error: "No payout tx to refresh" },
      { status: 400 },
    );
  }

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

  const fromAddress = task.payoutFromAddress;
  if (!fromAddress) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing payoutFromAddress on task. (Approve once to populate it.)",
      },
      { status: 400 },
    );
  }

  // Best-effort: if the receipt isn't ready yet, we still return balances.
  let receiptFound = false;
  try {
    const pc = makePublicClient();
    await pc.getTransactionReceipt({ hash: task.payoutTxHash });
    receiptFound = true;
  } catch {
    // ignore
  }

  const [fromNow, toNow] = await Promise.all([
    erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: fromAddress }),
    erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: worker.address }),
  ]);

  const updated = updateTask(id, {
    payoutReceiptFound: receiptFound,
    payoutFromBalanceAfter: fromNow.toString(),
    payoutToBalanceAfter: toNow.toString(),
  });

  return NextResponse.json({ ok: true, task: updated, receiptFound });
}
