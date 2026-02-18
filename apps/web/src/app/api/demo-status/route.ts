import { NextResponse } from "next/server";

import { CELO_SEPOLIA_USDM, erc20BalanceOf } from "@tabless/celo";
import { privateKeyToAccount } from "viem/accounts";

// Returns a non-sensitive snapshot of demo readiness.
// This is used by the UI to avoid demo failures (missing env vars / unfunded wallet).
export async function GET() {
  const worker1 = process.env.WORKER_ADDRESS;
  const worker2 = process.env.WORKER2_ADDRESS;

  const pk = (process.env.ROUTER_PRIVATE_KEY ??
    process.env.FUNDER_PRIVATE_KEY) as `0x${string}` | undefined;

  const routerConfigured = !!pk;
  const routerAddress = pk ? privateKeyToAccount(pk).address : undefined;

  let routerUsdmBalance: string | null = null;
  if (routerAddress) {
    try {
      const bal = await erc20BalanceOf({ token: CELO_SEPOLIA_USDM, owner: routerAddress });
      routerUsdmBalance = bal.toString();
    } catch {
      // best-effort (RPC may be rate-limited on public providers)
      routerUsdmBalance = null;
    }
  }

  return NextResponse.json({
    ok: true,
    network: "celo-sepolia",
    celoscanBaseUrl: "https://sepolia.celoscan.io",
    router: {
      configured: routerConfigured,
      address: routerAddress,
      usdmBalance: routerUsdmBalance,
    },
    workers: {
      worker1Configured: !!worker1,
      worker2Configured: !!worker2,
    },
  });
}
