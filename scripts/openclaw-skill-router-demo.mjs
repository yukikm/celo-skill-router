#!/usr/bin/env node

/**
 * OpenClaw Skill Router Demo Driver
 *
 * Any agent can run this. The agent uses its own wallet to pay.
 *
 * Required env:
 * - SKILL_ROUTER_URL (default: http://localhost:3000)
 * - AGENT_PRIVATE_KEY (0x...) — the agent's Celo Sepolia wallet (CELO + USDm)
 *
 * Optional env:
 * - WORKER_AGENT_ADDRESS (0x...) — if not set, uses the agent's own address as worker
 * - BUYER_AGENT_PRIVATE_KEY — legacy alias for AGENT_PRIVATE_KEY
 */

import process from "node:process";

const base = (
  process.env.SKILL_ROUTER_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

const agentPk =
  process.env.AGENT_PRIVATE_KEY ?? process.env.BUYER_AGENT_PRIVATE_KEY;

if (!agentPk) {
  console.error(
    "Missing AGENT_PRIVATE_KEY (or BUYER_AGENT_PRIVATE_KEY). " +
      "Set it in OpenClaw secrets/env — this is the agent's Celo Sepolia wallet.",
  );
  process.exit(1);
}

// Derive agent address from private key.
const { privateKeyToAccount } = await import("viem/accounts");
const agentAccount = privateKeyToAccount(agentPk);
const agentAddress = agentAccount.address;

const workerAddr =
  process.env.WORKER_AGENT_ADDRESS ?? agentAddress; // fallback: pay self for demo

console.log(`Skill Router Demo`);
console.log(`  URL:    ${base}`);
console.log(`  Agent:  ${agentAddress}`);
console.log(`  Worker: ${workerAddr}`);
console.log();

async function api(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

// 1) Register buyer agent
console.log("1) Registering buyer agent...");
await api("POST", "/api/agents/register", {
  id: `agent:buyer:${agentAddress.slice(0, 10)}`,
  name: "Buyer Agent",
  address: agentAddress,
  skills: ["buy"],
});

// 2) Register worker agent
console.log("2) Registering worker agent...");
await api("POST", "/api/agents/register", {
  id: `agent:worker:${workerAddr.slice(0, 10)}`,
  name: "Worker Agent",
  address: workerAddr,
  skills: ["translate", "summarize", "onchain-research", "celoscan"],
});

// 3) Create task
console.log("3) Creating task...");
const { json: created } = await api("POST", "/api/tasks", {
  title: "Translate hackathon pitch to Portuguese",
  description:
    "Translate this pitch to PT-BR:\n\nSkill Router is an agent-to-agent marketplace on Celo. Post a task → route to a verified specialist → approve → pay on-chain.",
  skill: "translate",
  budgetUsd: "1",
  buyerAddress: agentAddress,
});

if (!created?.ok) {
  console.error("Failed to create task:", created);
  process.exit(1);
}
const taskId = created.task.id;
console.log(`   Task: ${taskId}`);

// 4) Route
console.log("4) Routing to worker...");
const { json: routed } = await api(
  "POST",
  `/api/tasks/${taskId}/route-to-agent`,
);
console.log(`   Routed to: ${routed?.routedTo?.name ?? "unknown"}`);

// 5) Submit deliverable
console.log("5) Submitting deliverable...");
await api("POST", `/api/tasks/${taskId}/submit`, {
  deliverable:
    "PT-BR: Skill Router é um marketplace de agente-para-agente no Celo. Publique uma tarefa → roteie → aprove → pague on-chain.",
});

// 6) Approve (expect 402 → pay → finalize)
console.log("6) Approving (expecting 402 payment terms)...");
const attempt = await api("POST", `/api/tasks/${taskId}/approve`);

if (attempt.status === 402) {
  const terms = attempt.json;
  console.log(`   Payment required:`);
  console.log(`     Token:     ${terms.tokenSymbol} (${terms.token})`);
  console.log(`     Amount:    ${terms.amountHuman} ${terms.tokenSymbol}`);
  console.log(`     Recipient: ${terms.recipient}`);
  console.log(`     Chain:     ${terms.chainId}`);

  // Pay from agent's wallet
  console.log("   Signing payment from agent wallet...");
  const { createWalletClient, http, erc20Abi } = await import("viem");

  const client = createWalletClient({
    account: agentAccount,
    chain: {
      id: 11142220,
      name: "Celo Sepolia",
      nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
      rpcUrls: {
        default: {
          http: ["https://forno.celo-sepolia.celo-testnet.org"],
        },
      },
    },
    transport: http("https://forno.celo-sepolia.celo-testnet.org"),
  });

  const txHash = await client.writeContract({
    address: terms.token,
    abi: erc20Abi,
    functionName: "transfer",
    args: [terms.recipient, BigInt(terms.amount)],
    account: agentAccount,
  });

  console.log(`   Paid: ${txHash}`);
  console.log(
    `   Celoscan: https://sepolia.celoscan.io/tx/${txHash}`,
  );

  // Finalize approval with proof
  console.log("   Finalizing approval with payoutTxHash...");
  const final = await api("POST", `/api/tasks/${taskId}/approve`, {
    payoutTxHash: txHash,
  });

  if (final.json?.ok) {
    console.log(`   ✅ APPROVED`);
  } else {
    console.log(`   ⚠️  Finalize response:`, final.json);
  }

  console.log();
  console.log(`=== RESULTS ===`);
  console.log(`Task URL:  ${base}/tasks/${taskId}`);
  console.log(`Tx Hash:   ${txHash}`);
  console.log(`Celoscan:  https://sepolia.celoscan.io/tx/${txHash}`);
  console.log(`Proof:     Paid 1 USDm to ${terms.recipient} — tx: https://sepolia.celoscan.io/tx/${txHash}`);
} else if (attempt.json?.ok) {
  // Server paid (custodial mode)
  console.log(`   ✅ APPROVED (server-side payment)`);
  console.log(`   Tx: ${attempt.json.payoutTxHash}`);
  console.log();
  console.log(`=== RESULTS ===`);
  console.log(`Task URL:  ${base}/tasks/${taskId}`);
  console.log(`Tx Hash:   ${attempt.json.payoutTxHash}`);
  console.log(
    `Celoscan:  https://sepolia.celoscan.io/tx/${attempt.json.payoutTxHash}`,
  );
} else {
  console.error("Unexpected approve response:", attempt.json);
  process.exit(1);
}

console.log();
console.log("Done.");
