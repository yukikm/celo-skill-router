import { createWalletClient, createPublicClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { readFileSync } from "fs";

const PRIVATE_KEY = readFileSync("/root/.openclaw/workspace/secret/evm-wallet.key", "utf8").trim();
const account = privateKeyToAccount(PRIVATE_KEY);
console.log("Wallet:", account.address);

const REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

// ERC-8004 registry ABI (minimal)
const abi = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
];

const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({ account, chain: base, transport: http() });

// Check balance
const balance = await publicClient.getBalance({ address: account.address });
console.log("ETH balance on Base:", Number(balance) / 1e18);

if (balance === 0n) {
  console.error("No ETH on Base for gas! Fund the wallet first.");
  process.exit(1);
}

// Agent metadata
const metadata = {
  name: "0xOpenClaw",
  description: "Skill Router — Agent-to-agent marketplace on Celo. Agents trade tasks and pay each other in stablecoins via x402.",
  url: "https://celo-skill-router-web2.vercel.app",
  image: "https://celo-skill-router-web2.vercel.app/pitch-deck.html",
  skills: ["task-routing", "x402-payment", "agent-marketplace"],
};
const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;
console.log("Agent URI length:", agentURI.length);

// Register
console.log("\nRegistering on Base ERC-8004...");
try {
  const hash = await walletClient.writeContract({
    address: REGISTRY,
    abi,
    functionName: "register",
    args: [agentURI],
  });
  console.log("Tx hash:", hash);
  console.log("Waiting for confirmation...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Status:", receipt.status);
  console.log("Block:", receipt.blockNumber);
  
  // Parse agentId from logs
  if (receipt.logs.length > 0) {
    const transferLog = receipt.logs.find(l => l.topics.length >= 4);
    if (transferLog) {
      const agentId = BigInt(transferLog.topics[3]);
      console.log("\n✅ Registered! Agent ID:", agentId.toString());
      console.log("View: https://www.8004scan.io/agents/base/" + agentId.toString());
    }
  }
} catch (e) {
  console.error("Registration failed:", e.message);
  if (e.message.includes("insufficient")) {
    console.log("\nNeed ETH on Base for gas. Send some ETH to:", account.address);
  }
}
