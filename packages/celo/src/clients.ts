import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { celoSepolia } from "./chain";

export function makePublicClient() {
  return createPublicClient({
    chain: celoSepolia,
    transport: http(celoSepolia.rpcUrls.default.http[0]!),
  });
}

export function makeWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: celoSepolia,
    transport: http(celoSepolia.rpcUrls.default.http[0]!),
  });

  return { client, account };
}
