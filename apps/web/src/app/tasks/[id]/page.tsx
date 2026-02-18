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

  useEffect(() => { refresh(); }, []);

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

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/tasks">← Tasks</Link>
        <h1 style={{ fontSize: 24, margin: 0 }}>{task.title}</h1>
      </div>

      <div style={{ marginTop: 8, color: "#888", fontSize: 13 }}>
        skill: <b>{task.skill}</b> • budget: <b>{task.budgetUsd} USDm</b> • status: <b>{task.status}</b>
      </div>

      {/* Guided next step */}
      {nextAction && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.06)", fontSize: 13 }}>
          <b>Next: {nextAction.label}</b> — {nextAction.hint}
        </div>
      )}

      <pre style={{ marginTop: 14, whiteSpace: "pre-wrap", border: "1px solid #ddd", borderRadius: 12, padding: 12, fontSize: 13 }}>
        {task.description}
      </pre>

      {/* Claim (for workers) */}
      {task.status === "OPEN" && !task.workerAgentId && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.05)" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>🙋 Claim this task (as worker)</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={claimAgentId}
              onChange={(e) => setClaimAgentId(e.target.value)}
              placeholder="Your agent ID (e.g. agent:worker:myagent)"
              style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.2)", color: "#f3f3f5", fontSize: 13 }}
            />
            <button
              disabled={busy || !claimAgentId.trim()}
              onClick={() => act("claim", { agentId: claimAgentId.trim() })}
              style={{ padding: "8px 16px", borderRadius: 10, background: "#34d399", color: "#0b0b0d", fontWeight: 800, border: "none", cursor: (busy || !claimAgentId.trim()) ? "not-allowed" : "pointer", fontSize: 13 }}
            >
              Claim
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 6 }}>
            Must be registered with the required skill: <b>{task.skill}</b>.{" "}
            <Link href="/agents/register" style={{ color: "#34d399" }}>Register first →</Link>
          </div>
        </div>
      )}

      {/* Worker info */}
      {task.workerAgentId && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          routed to: <b>{worker?.name ?? task.workerAgentId}</b>
          {worker?.address && (
            <span> — <code>{shortHex(worker.address)}</code>
              <button onClick={() => copy(worker.address)} style={{ fontSize: 11, marginLeft: 4 }}>
                {copied === worker.address ? "Copied" : "Copy"}
              </button>
              <a href={`${celoscanBase}/address/${worker.address}`} target="_blank" rel="noreferrer" style={{ marginLeft: 6 }}>Celoscan</a>
            </span>
          )}
        </div>
      )}

      {/* 402 Payment Terms (x402) */}
      {paymentTerms && (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 14, border: "2px solid #f59e0b", background: "#fffbeb" }}>
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 8 }}>⚡ Payment Required (402)</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            <div>Token: <b>{paymentTerms.tokenSymbol}</b> (<code>{shortHex(paymentTerms.token)}</code>)</div>
            <div>Amount: <b>{paymentTerms.amountHuman} {paymentTerms.tokenSymbol}</b></div>
            <div>Recipient (worker): <code>{shortHex(paymentTerms.recipient)}</code></div>
            <div>Chain: Celo Sepolia ({paymentTerms.chainId})</div>
            <div>Memo: <code>{paymentTerms.memo}</code></div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!walletConnected ? (
              <button onClick={connectWallet} style={{ padding: "10px 16px", borderRadius: 12, background: "#f59e0b", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>
                Connect Wallet (MiniPay / MetaMask)
              </button>
            ) : (
              <button onClick={payFromWallet} disabled={payingFromWallet} style={{ padding: "10px 16px", borderRadius: 12, background: "#10b981", color: "#fff", fontWeight: 800, border: "none", cursor: payingFromWallet ? "not-allowed" : "pointer" }}>
                {payingFromWallet ? "Signing…" : `Pay ${paymentTerms.amountHuman} ${paymentTerms.tokenSymbol}`}
              </button>
            )}
            {walletConnected && walletAddress && (
              <span style={{ fontSize: 12, color: "#666", alignSelf: "center" }}>
                Connected: {shortHex(walletAddress)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Payout info */}
      {task.payoutTxHash && (
        <div style={{ marginTop: 16, fontSize: 13 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            payout tx: <code>{shortHex(task.payoutTxHash)}</code>
            <button onClick={() => copy(task.payoutTxHash!)} style={{ fontSize: 11 }}>
              {copied === task.payoutTxHash ? "Copied" : "Copy"}
            </button>
            <a href={`${celoscanBase}/tx/${task.payoutTxHash}`} target="_blank" rel="noreferrer">Celoscan</a>
          </div>

          <div style={{ marginTop: 4, color: task.payoutReceiptFound ? "#0a7" : "#a60" }}>
            status: <b>{task.payoutReceiptFound ? "confirmed ✅" : "pending…"}</b>
            {!task.payoutReceiptFound && (
              <span style={{ color: "#888" }}> (auto-checking {autoRefreshCount + 1}/8)</span>
            )}
          </div>

          {/* Payment summary */}
          <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid #e5e5e5", background: "#fafafa" }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Payment summary</div>
            <div>amount: <b>{payoutAmountUsdM} USDm</b></div>
            {task.payoutFromAddress && <div>from: <code>{shortHex(task.payoutFromAddress)}</code></div>}
            {worker?.address && <div>to (worker): <code>{shortHex(worker.address)}</code></div>}
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
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px dashed rgba(0,0,0,0.15)", background: "rgba(0,0,0,0.03)" }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Judge-ready proof</div>
            <code style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{proofText}</code>
            <button onClick={() => copy(proofText)} style={{ fontSize: 11, marginLeft: 8 }}>
              {copied === proofText ? "Copied" : "Copy proof"}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          disabled={busy}
          onClick={() => act("route-to-agent")}
          style={{ padding: "10px 14px", borderRadius: 12, fontWeight: isHighlight("route") ? 800 : 400, background: isHighlight("route") ? "#111" : "#fff", color: isHighlight("route") ? "#fff" : "#111", border: "1px solid #ccc", cursor: busy ? "not-allowed" : "pointer" }}
        >
          Route to agent
        </button>
        <button
          disabled={busy}
          onClick={() => act("submit", { output: "Demo deliverable: agent output goes here." })}
          style={{ padding: "10px 14px", borderRadius: 12, fontWeight: isHighlight("submit") ? 800 : 400, background: isHighlight("submit") ? "#111" : "#fff", color: isHighlight("submit") ? "#fff" : "#111", border: "1px solid #ccc", cursor: busy ? "not-allowed" : "pointer" }}
        >
          Submit work
        </button>
        <button
          disabled={busy || task.status === "APPROVED" || !!task.payoutTxHash}
          onClick={() => act("approve")}
          style={{ padding: "10px 14px", borderRadius: 12, fontWeight: isHighlight("approve") ? 800 : 400, background: isHighlight("approve") ? "#111" : "#fff", color: isHighlight("approve") ? "#fff" : "#111", border: "1px solid #ccc", cursor: (busy || task.status === "APPROVED") ? "not-allowed" : "pointer" }}
        >
          Approve + pay
        </button>
        {task.payoutTxHash && (
          <button
            disabled={busy || pollingPayout}
            onClick={() => refreshPayout()}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", cursor: (busy || pollingPayout) ? "not-allowed" : "pointer" }}
          >
            {pollingPayout ? "Checking…" : "Refresh payout"}
          </button>
        )}
      </div>

      {err && <pre style={{ marginTop: 12, color: "#b00", whiteSpace: "pre-wrap", fontSize: 13 }}>{err}</pre>}

      <p style={{ marginTop: 20, fontSize: 11, color: "#999" }}>
        Payment: agent pays from its own wallet via x402 (402 Payment Required).
        No server-side private keys required.
      </p>
    </main>
  );
}
