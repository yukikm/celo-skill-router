#!/usr/bin/env node

/**
 * OpenClaw demo driver for Skill Router.
 *
 * Env:
 * - SKILL_ROUTER_URL (default: http://localhost:3000)
 * - BUYER_AGENT_PRIVATE_KEY (0x...)   (required in non-custodial mode)
 * - WORKER_AGENT_ADDRESS (0x...)
 */

import process from "node:process";

const base = (process.env.SKILL_ROUTER_URL ?? "http://localhost:3000").replace(/\/$/, "");
const buyerPk = process.env.BUYER_AGENT_PRIVATE_KEY;
const workerAddr = process.env.WORKER_AGENT_ADDRESS;

if (!workerAddr) {
  console.error("Missing WORKER_AGENT_ADDRESS");
  process.exit(1);
}

const buyerAgent = {
  id: "agent:buyer:openclaw",
  name: "Buyer Agent (OpenClaw)",
  address: "0x0000000000000000000000000000000000000000", // not required by router today
  skills: ["buy"],
};

const workerAgent = {
  id: "agent:worker:generic",
  name: "Worker Agent (Generic)",
  address: workerAddr,
  skills: ["translate", "summarize", "onchain-research", "celoscan"],
};

async function j(method, path, body) {
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
  return { res, json };
}

console.log(`Skill Router demo @ ${base}`);

// Register agents
await j("POST", "/api/agents/register", buyerAgent);
await j("POST", "/api/agents/register", workerAgent);

// Create task
const { json: created } = await j("POST", "/api/tasks", {
  title: "Translate pitch to PT-BR (agent-to-agent)",
  description:
    "Translate this pitch to PT-BR:\n\nSkill Router is an agent-to-agent marketplace on Celo. Post a task → route → submit → approve → pay on-chain.",
  skill: "translate",
  budgetUsd: "1",
});

if (!created?.ok) {
  console.error("Failed to create task", created);
  process.exit(1);
}

const taskId = created.task.id;
console.log(`Created task: ${taskId}`);

// Route
await j("POST", `/api/tasks/${taskId}/route-to-agent`);
console.log(`Routed task.`);

// Submit
await j("POST", `/api/tasks/${taskId}/submit`, {
  deliverable:
    "PT-BR: Skill Router é um marketplace de agente-para-agente no Celo. Publique uma tarefa → roteie para um especialista verificado → aprove → pague on-chain.",
});
console.log(`Submitted deliverable.`);

// Approve: may return 402
const attempt1 = await j("POST", `/api/tasks/${taskId}/approve`);

if (attempt1.res.status === 402) {
  const terms = attempt1.json;
  console.log("Payment required (402). Terms:", {
    recipient: terms.recipient,
    amountHuman: terms.amountHuman,
    token: terms.token,
    chainId: terms.chainId,
  });

  if (!buyerPk) {
    console.error("Missing BUYER_AGENT_PRIVATE_KEY to settle 402 payment terms.");
    process.exit(1);
  }

  // Lazy-import viem so local installs work.
  const { createWalletClient, http, erc20Abi } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");

  const account = privateKeyToAccount(buyerPk);
  const client = createWalletClient({
    account,
    chain: {
      id: 11142220,
      name: "Celo Sepolia",
      nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
      rpcUrls: { default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] } },
    },
    transport: http("https://forno.celo-sepolia.celo-testnet.org"),
  });

  const txHash = await client.writeContract({
    address: terms.token,
    abi: erc20Abi,
    functionName: "transfer",
    args: [terms.recipient, BigInt(terms.amount)],
    account,
  });

  console.log(`Paid onchain: ${txHash}`);

  const final = await j("POST", `/api/tasks/${taskId}/approve`, {
    payoutTxHash: txHash,
  });

  console.log("Approve finalized:", final.json.ok ? "OK" : final.json);
} else {
  console.log("Approve result:", attempt1.json.ok ? "OK" : attempt1.json);
}

console.log(`Done. Open task UI: ${base}/tasks/${taskId}`);
