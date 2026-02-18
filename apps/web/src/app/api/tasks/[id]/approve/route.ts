import { NextResponse } from "next/server";

import { getAgent, getTask, updateTask } from "@tabless/core";
import {
  CELO_SEPOLIA_USDM,
  erc20BalanceOf,
  erc20Transfer,
  makePublicClient,
} from "@tabless/celo";
import { privateKeyToAccount } from "viem/accounts";

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

  const pk = (process.env.ROUTER_PRIVATE_KEY ??
    process.env.FUNDER_PRIVATE_KEY) as `0x${string}` | undefined;
  if (!pk) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing ROUTER_PRIVATE_KEY (preferred) or FUNDER_PRIVATE_KEY env var (funded demo wallet) to pay worker.",
      },
      { status: 500 },
    );
  }

  if (worker.address.toLowerCase() === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Worker address is not configured. Set WORKER_ADDRESS / WORKER2_ADDRESS env var(s) to real Celo Sepolia addresses.",
      },
      { status: 400 },
    );
  }

  // MVP: interpret budgetUsd as a whole-number USDm amount.
  // You can set budgets like "1" or "5" for demo.
  const amountUnits = BigInt(Math.max(1, Number(task.budgetUsd || "1")));
  const amount = amountUnits * 10n ** 18n;

  const routerAccount = privateKeyToAccount(pk);
  const routerAddress = routerAccount.address;

  // Read balances pre-tx for demo visibility.
  const [fromBefore, toBefore] = await Promise.all([
    erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: routerAddress }),
    erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: worker.address }),
  ]);

  const hash = await erc20Transfer({
    token: CELO_SEPOLIA_USDM,
    fromPrivateKey: pk,
    to: worker.address,
    amount,
  });

  // Best-effort wait so the UI can show real post-tx balances.
  let fromAfter: bigint | null = null;
  let toAfter: bigint | null = null;
  let receiptFound = false;
  try {
    const pc = makePublicClient();
    await pc.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 25_000 });
    receiptFound = true;
    [fromAfter, toAfter] = await Promise.all([
      erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: routerAddress }),
      erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: worker.address }),
    ]);
  } catch {
    // ignore: explorers will still show finality; UI can refresh later.
  }

  const updated = updateTask(id, {
    status: "APPROVED",
    payoutTxHash: hash,
    payoutReceiptFound: receiptFound,
    payoutFromAddress: routerAddress,
    payoutFromBalanceBefore: fromBefore.toString(),
    payoutFromBalanceAfter: (fromAfter ?? fromBefore).toString(),
    payoutToBalanceBefore: toBefore.toString(),
    payoutToBalanceAfter: (toAfter ?? toBefore).toString(),
  });

  return NextResponse.json({ ok: true, task: updated, payoutTxHash: hash });
}
