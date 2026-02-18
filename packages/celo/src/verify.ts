import { decodeEventLog, erc20Abi, type Hex } from "viem";

import { makePublicClient } from "./clients";

/**
 * Best-effort verification that a tx includes an ERC20 Transfer(to, value)
 * for the expected token and recipient.
 */
export async function verifyErc20Transfer(args: {
  txHash: Hex;
  token: `0x${string}`;
  to: `0x${string}`;
  minAmount: bigint;
}) {
  const pc = makePublicClient();
  const receipt = await pc.waitForTransactionReceipt({
    hash: args.txHash,
    confirmations: 1,
    timeout: 25_000,
  });

  // Search logs for ERC20 Transfer event.
  for (const log of receipt.logs) {
    if ((log.address ?? "").toLowerCase() !== args.token.toLowerCase())
      continue;

    try {
      const decoded = decodeEventLog({
        abi: erc20Abi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== "Transfer") continue;
      const to = (decoded.args as any).to as string | undefined;
      const value = (decoded.args as any).value as bigint | undefined;

      if (!to || value == null) continue;
      if (to.toLowerCase() !== args.to.toLowerCase()) continue;
      if (value < args.minAmount) continue;

      return {
        ok: true as const,
        receipt,
        from: receipt.from,
        to,
        value,
      };
    } catch {
      // ignore non-matching logs
    }
  }

  return { ok: false as const, receipt };
}
