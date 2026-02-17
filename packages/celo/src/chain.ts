import { defineChain } from "viem";

export const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://forno.celo-sepolia.celo-testnet.org"],
    },
  },
  blockExplorers: {
    default: { name: "Celoscan", url: "https://sepolia.celoscan.io" },
  },
});

export const CELO_SEPOLIA_USDM =
  "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b" as const;

// USDT is also available on Celo Sepolia per Celo docs:
// 0xd077A400968890Eacc75cdc901F0356c943e4fDb
