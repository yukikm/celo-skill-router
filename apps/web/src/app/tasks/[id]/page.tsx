"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";

type Task = {
  id: string;
  title: string;
  description: string;
  skill: string;
  budgetUsd: string;
  status: string;
  workerAgentId?: string;
  payoutTxHash?: string;
  payoutReceiptFound?: boolean;
  payoutFromAddress?: string;
  payoutFromBalanceBefore?: string;
  payoutFromBalanceAfter?: string;
  payoutToBalanceBefore?: string;
  payoutToBalanceAfter?: string;
};

type Worker = { id: string; name: string; address: string };

type PaymentTerms = {
  token: string;
  tokenSymbol: string;
  tokenDecimals: number;
  chainId: number;
  recipient: string;
  amount: string;
  amountHuman: string;
  memo: string;
};

export default function TaskPage({ params }: { params: { id: string } }) {
  const [task, setTask] = useState<Task | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [payingFromWallet, setPayingFromWallet] = useState(false);
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);
  const [lastPayoutCheckAt, setLastPayoutCheckAt] = useState<number | null>(null);
  const [pollingPayout, setPollingPayout] = useState(false);
  const [claimAgentId, setClaimAgentId] = useState("");
  const [submitOutput, setSubmitOutput] = useState("");
  const [agents, setAgents] = useState<{ id: string; name: string; skills: string[] }[]>([]);

  const celoscanBase = "https://sepolia.celoscan.io";

  function shortHex(hex: string) {
    if (!hex || hex.length <= 12) return hex;
    return `${hex.slice(0, 8)}…${hex.slice(-4)}`;
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied((p) => (p === text ? null : p)), 1200);
    } catch {}
  }

  async function refresh() {
    const res = await fetch(`/api/tasks/${params.id}`, { cache: "no-store" });
    const data = await res.json();
    setTask(data.task);
    setWorker(data.worker ?? null);
  }

  useEffect(() => {
    refresh();
    fetch("/api/agents").then(r => r.json()).then(d => {
      if (d.agents) setAgents(d.agents);
    }).catch(() => {});
  }, []);

  useEffect(() => { setAutoRefreshCount(0); }, [task?.payoutTxHash]);

  // Auto-poll for payout confirmation
  useEffect(() => {
    if (!task?.payoutTxHash || task.payoutReceiptFound || autoRefreshCount >= 8) return;
    const t = setTimeout(async () => {
      await refreshPayout(true);
      setAutoRefreshCount((c) => c + 1);
    }, 6000);
    return () => clearTimeout(t);
  }, [task?.payoutTxHash, task?.payoutReceiptFound, autoRefreshCount]);

  async function act(path: string, body?: any) {
    setBusy(true);
    setErr(null);
    setPaymentTerms(null);
    try {
      const res = await fetch(`/api/tasks/${params.id}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();

      // Handle 402 Payment Required (x402)
      if (res.status === 402 && data.paymentRequired) {
        setPaymentTerms(data as PaymentTerms);
        return;
      }

      if (!res.ok || data.ok === false) {
        setErr(typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? data));
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function refreshPayout(silent = false) {
    if (!silent) setBusy(true);
    setPollingPayout(true);
    setErr(null);
    try {
      const res = await fetch(`/api/tasks/${params.id}/refresh-payout`, { method: "POST" });
      const data = await res.json();
      if (!res.ok && !silent) {
        setErr(typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? data));
      }
      setLastPayoutCheckAt(Date.now());
      await refresh();
    } finally {
      setPollingPayout(false);
      if (!silent) setBusy(false);
    }
  }

  // Connect wallet (MiniPay / MetaMask / any injected provider)
  async function connectWallet() {
    const eth = (window as any).ethereum;
    if (!eth) {
      setErr("No wallet found. Install MiniPay or MetaMask.");
      return;
    }
    try {
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      if (accounts?.[0]) {
        setWalletAddress(accounts[0]);
        setWalletConnected(true);

        // Switch to Celo Sepolia if not already
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7ac" }], // 11142220 in hex
          });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0xaa36a7ac",
                chainName: "Celo Sepolia",
                nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
                rpcUrls: ["https://forno.celo-sepolia.celo-testnet.org"],
                blockExplorerUrls: ["https://sepolia.celoscan.io"],
              }],
            });
          }
        }
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to connect wallet");
    }
  }

  // Pay from connected wallet (handles 402 payment terms)
  async function payFromWallet() {
    if (!paymentTerms || !walletAddress) return;
    setPayingFromWallet(true);
    setErr(null);
    try {
      const eth = (window as any).ethereum;

      // ERC20 transfer(address,uint256) selector = 0xa9059cbb
      const recipientPadded = paymentTerms.recipient.slice(2).padStart(64, "0");
      const amountHex = BigInt(paymentTerms.amount).toString(16).padStart(64, "0");
      const data = `0xa9059cbb${recipientPadded}${amountHex}`;

      const txHash = await eth.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: paymentTerms.token,
          data,
        }],
      });

      // Finalize approval with payoutTxHash
      setPaymentTerms(null);
      const res = await fetch(`/api/tasks/${params.id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payoutTxHash: txHash }),
      });
      const result = await res.json();
      if (!res.ok || result.ok === false) {
        setErr(typeof result?.error === "string" ? result.error : JSON.stringify(result?.error ?? result));
      }
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Payment failed");
    } finally {
      setPayingFromWallet(false);
    }
  }

  if (!task) {
    return (
      <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <Link href="/tasks">← Tasks</Link>
        <div style={{ marginTop: 16 }}>Loading…</div>
      </main>
    );
  }

  const payoutAmountUsdM = Math.max(1, Number(task.budgetUsd || "1"));
  const proofText = task.payoutTxHash
    ? `Paid ${payoutAmountUsdM} USDm on Celo Sepolia → worker ${worker?.address ?? ""}\nTx: ${celoscanBase}/tx/${task.payoutTxHash}`
    : "";

  const nextAction =
    !task.workerAgentId
      ? { key: "route", label: "Route to agent", hint: "Step 1 — assign to a worker agent." }
      : task.status !== "SUBMITTED" && task.status !== "APPROVED"
        ? { key: "submit", label: "Submit work", hint: "Step 2 — add agent output." }
        : !task.payoutTxHash
          ? { key: "approve", label: "Approve + pay", hint: "Step 3 — trigger onchain USDm transfer." }
          : task.payoutReceiptFound
            ? null
            : { key: "refresh", label: "Refresh payout", hint: "Checking finality…" };

  const isHighlight = (key: string) => nextAction?.key === key;

  // Progress steps
  const steps = [
    { label: "Posted", done: true },
    { label: "Claimed", done: !!task.workerAgentId },
    { label: "Submitted", done: task.status === "SUBMITTED" || task.status === "APPROVED" },
    { label: "Paid", done: task.status === "APPROVED" && !!task.payoutTxHash },
  ];

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "ui-sans-serif, system-ui", color: "#f3f3f5", background: "#0b0b0d", minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/tasks" style={{ color: "#a1a1aa", textDecoration: "none" }}>← Tasks</Link>
        <h1 style={{ fontSize: 24, margin: 0 }}>{task.title}</h1>
      </div>

      <div style={{ marginTop: 8, color: "#a1a1aa", fontSize: 13 }}>
        skill: <b style={{ color: "#d7d7dc" }}>{task.skill}</b> • budget: <b style={{ color: "#34d399" }}>{task.budgetUsd} USDm</b> • status: <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: task.status === "OPEN" ? "rgba(52,211,153,0.15)" : task.status === "APPROVED" ? "rgba(16,185,129,0.15)" : "rgba(251,191,36,0.15)", color: task.status === "OPEN" ? "#34d399" : task.status === "APPROVED" ? "#10b981" : "#fbbf24" }}>{task.status}</span>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 16, display: "flex", gap: 0, alignItems: "center" }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: s.done ? "#34d399" : "rgba(255,255,255,0.08)", color: s.done ? "#0b0b0d" : "#71717a" }}>
                {s.done ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: 10, color: s.done ? "#34d399" : "#71717a", marginTop: 4 }}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: steps[i + 1].done ? "#34d399" : "rgba(255,255,255,0.08)", margin: "0 4px", marginBottom: 16 }} />
            )}
          </div>
        ))}
      </div>

      {/* Guided next step */}
      {nextAction && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(52,211,153,0.15)", background: "rgba(52,211,153,0.05)", fontSize: 13, color: "#d7d7dc" }}>
          <b style={{ color: "#34d399" }}>Next: {nextAction.label}</b> — {nextAction.hint}
        </div>
      )}

      <pre style={{ marginTop: 14, whiteSpace: "pre-wrap", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, fontSize: 13, background: "rgba(0,0,0,0.2)", color: "#d7d7dc" }}>
        {task.description}
      </pre>

      {/* Claim (for workers) */}
      {task.status === "OPEN" && !task.workerAgentId && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.05)" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>🙋 Claim this task (as worker)</div>
          {(() => {
            const matching = agents.filter(a => a.skills.includes(task.skill));
            const options = matching.length > 0 ? matching : agents;
            return (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {options.length > 0 ? (
                  <select
                    value={claimAgentId}
                    onChange={(e) => setClaimAgentId(e.target.value)}
                    style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.2)", color: "#f3f3f5", fontSize: 13, cursor: "pointer" }}
                  >
                    <option value="">Select an agent…</option>
                    {options.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.skills.join(", ")})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={claimAgentId}
                    onChange={(e) => setClaimAgentId(e.target.value)}
                    placeholder="Your agent ID (e.g. agent:worker:myagent)"
                    style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.2)", color: "#f3f3f5", fontSize: 13 }}
                  />
                )}
                <button
                  disabled={busy || !claimAgentId.trim()}
                  onClick={() => act("claim", { agentId: claimAgentId.trim() })}
                  style={{ padding: "8px 16px", borderRadius: 10, background: "#34d399", color: "#0b0b0d", fontWeight: 800, border: "none", cursor: (busy || !claimAgentId.trim()) ? "not-allowed" : "pointer", fontSize: 13 }}
                >
                  Claim
                </button>
              </div>
            );
          })()}
          <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 6 }}>
            {agents.filter(a => a.skills.includes(task.skill)).length > 0
              ? <>Showing agents with skill <b>{task.skill}</b>.</>
              : <>No agents with skill <b>{task.skill}</b> found.{" "}<Link href="/agents/register" style={{ color: "#34d399" }}>Register one →</Link></>
            }
          </div>
        </div>
      )}

      {/* Worker info */}
      {task.workerAgentId && (
        <div style={{ marginTop: 12, fontSize: 13, padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          🤖 Worker: <b>{worker?.name ?? task.workerAgentId}</b>
          {worker?.address && (
            <span> — <code style={{ color: "#a1a1aa" }}>{shortHex(worker.address)}</code>
              <button onClick={() => copy(worker.address)} style={{ fontSize: 11, marginLeft: 4, background: "none", border: "none", color: "#34d399", cursor: "pointer" }}>
                {copied === worker.address ? "✓" : "copy"}
              </button>
              <a href={`${celoscanBase}/address/${worker.address}`} target="_blank" rel="noreferrer" style={{ marginLeft: 6, color: "#34d399", fontSize: 11 }}>Celoscan ↗</a>
            </span>
          )}
        </div>
      )}

      {/* 402 Payment Terms (x402) */}
      {paymentTerms && (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 14, border: "2px solid #f59e0b", background: "rgba(245,158,11,0.08)" }}>
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 8, color: "#f59e0b" }}>⚡ HTTP 402 — Payment Required</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: "#d7d7dc" }}>
            <div>Token: <b>{paymentTerms.tokenSymbol}</b> (<code style={{ color: "#a1a1aa" }}>{shortHex(paymentTerms.token)}</code>)</div>
            <div>Amount: <b style={{ color: "#34d399" }}>{paymentTerms.amountHuman} {paymentTerms.tokenSymbol}</b></div>
            <div>Recipient (worker): <code style={{ color: "#a1a1aa" }}>{shortHex(paymentTerms.recipient)}</code></div>
            <div>Chain: Celo Sepolia ({paymentTerms.chainId})</div>
            <div>Memo: <code style={{ color: "#a1a1aa" }}>{paymentTerms.memo}</code></div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {!walletConnected ? (
              <button onClick={connectWallet} style={{ padding: "12px 20px", borderRadius: 12, background: "#f59e0b", color: "#0b0b0d", fontWeight: 800, border: "none", cursor: "pointer", fontSize: 14 }}>
                🔗 Connect Wallet (MiniPay / MetaMask)
              </button>
            ) : (
              <button onClick={payFromWallet} disabled={payingFromWallet} style={{ padding: "12px 20px", borderRadius: 12, background: "#34d399", color: "#0b0b0d", fontWeight: 800, border: "none", cursor: payingFromWallet ? "not-allowed" : "pointer", fontSize: 14 }}>
                {payingFromWallet ? "Signing…" : `💸 Pay ${paymentTerms.amountHuman} ${paymentTerms.tokenSymbol}`}
              </button>
            )}
            {walletConnected && walletAddress && (
              <span style={{ fontSize: 12, color: "#a1a1aa" }}>
                Connected: {shortHex(walletAddress)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Payout info */}
      {task.payoutTxHash && (
        <div style={{ marginTop: 16, fontSize: 13, padding: 16, borderRadius: 14, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)" }}>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#10b981", fontSize: 15 }}>🎉 Payment Complete</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            tx: <code style={{ color: "#a1a1aa" }}>{shortHex(task.payoutTxHash)}</code>
            <button onClick={() => copy(task.payoutTxHash!)} style={{ fontSize: 11, background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "#34d399", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
              {copied === task.payoutTxHash ? "✓" : "copy"}
            </button>
            <a href={`${celoscanBase}/tx/${task.payoutTxHash}`} target="_blank" rel="noreferrer" style={{ color: "#34d399", fontSize: 12 }}>View on Celoscan ↗</a>
          </div>

          <div style={{ marginTop: 6, color: task.payoutReceiptFound ? "#10b981" : "#fbbf24" }}>
            onchain: <b>{task.payoutReceiptFound ? "confirmed ✅" : "pending…"}</b>
            {!task.payoutReceiptFound && (
              <span style={{ color: "#71717a" }}> (auto-checking {autoRefreshCount + 1}/8)</span>
            )}
          </div>

          {/* Payment summary */}
          <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.05)" }}>
            <div style={{ fontWeight: 800, marginBottom: 4, color: "#34d399" }}>💰 Payment summary</div>
            <div>amount: <b style={{ color: "#34d399" }}>{payoutAmountUsdM} USDm</b></div>
            {task.payoutFromAddress && <div>from: <code style={{ color: "#a1a1aa" }}>{shortHex(task.payoutFromAddress)}</code></div>}
            {worker?.address && <div>to (worker): <code style={{ color: "#a1a1aa" }}>{shortHex(worker.address)}</code></div>}
          </div>

          {/* Balances */}
          {task.payoutFromBalanceBefore && task.payoutFromBalanceAfter && (
            <div style={{ marginTop: 8 }}>
              payer balance: <b>{formatUnits(BigInt(task.payoutFromBalanceBefore), 18)} → {formatUnits(BigInt(task.payoutFromBalanceAfter), 18)}</b> USDm
            </div>
          )}
          {task.payoutToBalanceBefore && task.payoutToBalanceAfter && (
            <div>
              worker balance: <b>{formatUnits(BigInt(task.payoutToBalanceBefore), 18)} → {formatUnits(BigInt(task.payoutToBalanceAfter), 18)}</b> USDm
            </div>
          )}

          {/* Judge-ready proof */}
          <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.03)" }}>
            <div style={{ fontWeight: 800, marginBottom: 4, color: "#f3f3f5" }}>📋 Judge-ready proof</div>
            <code style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#d7d7dc" }}>{proofText}</code>
            <button onClick={() => copy(proofText)} style={{ fontSize: 11, marginLeft: 8, background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "#34d399", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
              {copied === proofText ? "✓ Copied" : "Copy proof"}
            </button>
          </div>
        </div>
      )}

      {/* Submit work input */}
      {task.workerAgentId && task.status !== "SUBMITTED" && task.status !== "APPROVED" && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.05)" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>📝 Submit deliverable</div>
          <textarea
            value={submitOutput}
            onChange={(e) => setSubmitOutput(e.target.value)}
            placeholder="Paste your work output here… (required)"
            rows={4}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.2)", color: "#f3f3f5", fontSize: 13, resize: "vertical" }}
          />
        </div>
      )}

      {/* Action buttons — only show relevant ones */}
      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {task.status === "OPEN" && !task.workerAgentId && (
          <button
            disabled={busy}
            onClick={() => act("route-to-agent")}
            style={{ padding: "10px 18px", borderRadius: 12, fontWeight: 800, background: "#34d399", color: "#0b0b0d", border: "none", cursor: busy ? "not-allowed" : "pointer", fontSize: 14 }}
          >
            ⚡ Auto-route to best agent
          </button>
        )}
        {task.workerAgentId && task.status !== "SUBMITTED" && task.status !== "APPROVED" && (
          <button
            disabled={busy || !submitOutput.trim()}
            onClick={() => act("submit", { output: submitOutput.trim() })}
            style={{ padding: "10px 18px", borderRadius: 12, fontWeight: 800, background: submitOutput.trim() ? "#34d399" : "rgba(255,255,255,0.1)", color: submitOutput.trim() ? "#0b0b0d" : "#71717a", border: "none", cursor: (busy || !submitOutput.trim()) ? "not-allowed" : "pointer", fontSize: 14 }}
          >
            📤 Submit work
          </button>
        )}
        {task.status === "SUBMITTED" && !task.payoutTxHash && (
          <button
            disabled={busy}
            onClick={() => act("approve")}
            style={{ padding: "10px 18px", borderRadius: 12, fontWeight: 800, background: "#f59e0b", color: "#fff", border: "none", cursor: busy ? "not-allowed" : "pointer", fontSize: 14 }}
          >
            💳 Approve + Pay (x402)
          </button>
        )}
        {task.payoutTxHash && !task.payoutReceiptFound && (
          <button
            disabled={busy || pollingPayout}
            onClick={() => refreshPayout()}
            style={{ padding: "10px 18px", borderRadius: 12, fontWeight: 700, background: "rgba(255,255,255,0.08)", color: "#d7d7dc", border: "1px solid rgba(255,255,255,0.12)", cursor: (busy || pollingPayout) ? "not-allowed" : "pointer", fontSize: 13 }}
          >
            {pollingPayout ? "Checking…" : "🔄 Refresh payout"}
          </button>
        )}
      </div>

      {err && <pre style={{ marginTop: 12, color: "#f87171", whiteSpace: "pre-wrap", fontSize: 13, padding: 10, borderRadius: 8, background: "rgba(248,113,113,0.1)" }}>{err}</pre>}

      <p style={{ marginTop: 20, fontSize: 11, color: "#71717a" }}>
        Payment: agent pays from its own wallet via x402 (HTTP 402 Payment Required).
        No server-side private keys required. Every payment is a real onchain USDm transfer.
      </p>
    </main>
  );
}
