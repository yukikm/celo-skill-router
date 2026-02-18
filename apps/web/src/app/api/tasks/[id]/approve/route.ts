import { NextResponse } from "next/server";

import { getAgent, getTask, updateTask } from "@tabless/core";
import {
  CELO_SEPOLIA_USDM,
  erc20BalanceOf,
  erc20Transfer,
  makePublicClient,
  verifyErc20Transfer,
} from "@tabless/celo";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Payment modes:
 * - Custodial demo: server pays from ROUTER_PRIVATE_KEY/FUNDER_PRIVATE_KEY.
 * - Open (agent-to-agent): if server key is missing, return 402 with payment terms.
 *   Caller pays from their own wallet, then calls approve again with { payoutTxHash }
 *   for best-effort onchain verification.
 */

export async function POST(
  req: Request,
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

  // Budget parsing + clamp.
  const parsedBudget = Number.parseInt(String(task.budgetUsd ?? "1"), 10);
  const safeBudget = Number.isFinite(parsedBudget) && parsedBudget >= 1 ? parsedBudget : 1;
  const clampedBudget = Math.min(safeBudget, 1_000);
  const amountUnits = BigInt(clampedBudget);
  const amount = amountUnits * 10n ** 18n;

  // Double-pay prevention.
  if (task.status === "APPROVED" || task.payoutTxHash) {
    return NextResponse.json(
      {
        ok: false,
        error: "Task already approved / payout already initiated.",
        task,
      },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const payoutTxHash = (body?.payoutTxHash as `0x${string}` | undefined) ?? undefined;

  const serverPk = (process.env.ROUTER_PRIVATE_KEY ??
    process.env.FUNDER_PRIVATE_KEY) as `0x${string}` | undefined;

  // Open mode: server has no payer key → return x402-style payment terms.
  if (!serverPk && !payoutTxHash) {
    if (
      worker.address.toLowerCase() ===
      "0x0000000000000000000000000000000000000000"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No payable worker address. Register an agent with a real onchain address, then route again.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        paymentRequired: true,
        status: 402,
        // Payment terms
        chainId: 11142220,
        token: CELO_SEPOLIA_USDM,
        tokenSymbol: "USDm",
        tokenDecimals: 18,
        recipient: worker.address,
        amount: amount.toString(),
        amountHuman: String(amountUnits),
        memo: `task:${task.id}`,
        howTo:
          "Pay the recipient this amount in USDm on Celo Sepolia, then POST again to /approve with { payoutTxHash }.",
      },
      { status: 402 },
    );
  }

  // Custodial mode (server pays directly).
  if (serverPk && !payoutTxHash) {
    if (
      worker.address.toLowerCase() ===
      "0x0000000000000000000000000000000000000000"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Worker address is 0x0. Register a worker agent with a real onchain address.",
        },
        { status: 400 },
      );
    }

    const routerAccount = privateKeyToAccount(serverPk);
    const routerAddress = routerAccount.address;

    const [fromBefore, toBefore] = await Promise.all([
      erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: routerAddress }),
      erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: worker.address }),
    ]);

    const hash = await erc20Transfer({
      token: CELO_SEPOLIA_USDM,
      fromPrivateKey: serverPk,
      to: worker.address,
      amount,
    });

    // Best-effort wait so the UI can show real post-tx balances.
    let fromAfter: bigint | null = null;
    let toAfter: bigint | null = null;
    let receiptFound = false;
    try {
      const pc = makePublicClient();
      await pc.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 25_000,
      });
      receiptFound = true;
      [fromAfter, toAfter] = await Promise.all([
        erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: routerAddress }),
        erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: worker.address }),
      ]);
    } catch {
      // ignore: UI can refresh later
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

  // Open mode finalize: caller provides a tx hash; verify it paid the worker.
  if (payoutTxHash) {
    const verified = await verifyErc20Transfer({
      txHash: payoutTxHash,
      token: CELO_SEPOLIA_USDM,
      to: worker.address,
      minAmount: amount,
    });

    if (!verified.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not verify payout transfer in tx logs (wrong token/recipient/amount or not confirmed yet).",
          payoutTxHash,
        },
        { status: 400 },
      );
    }

    let toAfter: bigint | null = null;
    try {
      toAfter = await erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: worker.address });
    } catch {
      // ignore
    }

    const updated = updateTask(id, {
      status: "APPROVED",
      payoutTxHash,
      payoutReceiptFound: true,
      payoutFromAddress: verified.from as `0x${string}`,
      payoutToBalanceAfter: toAfter ? toAfter.toString() : undefined,
    });

    return NextResponse.json({ ok: true, task: updated, payoutTxHash });
  }

  return NextResponse.json(
    { ok: false, error: "Unexpected approve state" },
    { status: 500 },
  );
}
