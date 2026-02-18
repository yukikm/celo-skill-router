import { decodeEventLog, erc20Abi } from "viem";

import { makePublicClient, makeWalletClient } from "./clients";

export async function erc20BalanceOf(args: {
  token: `0x${string}`;
  owner: `0x${string}`;
}) {
  const pc = makePublicClient();
  const bal = await pc.readContract({
    address: args.token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [args.owner],
  });
  return bal;
}

export async function erc20Transfer(args: {
  token: `0x${string}`;
  fromPrivateKey: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
}) {
  const { client, account } = makeWalletClient(args.fromPrivateKey);

  const hash = await client.writeContract({
    address: args.token,
    abi: erc20Abi,
    functionName: "transfer",
    args: [args.to, args.amount],
    account,
  });

  return hash;
}
