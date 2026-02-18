"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { CELO_SEPOLIA_USDM } from "@tabless/celo";

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

type Worker = {
  id: string;
  name: string;
  address: string;
};

export default function TaskPage({ params }: { params: { id: string } }) {
  const [task, setTask] = useState<Task | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [busy, setBusy] = useState(false);
  const [pollingPayout, setPollingPayout] = useState(false);
  const [lastPayoutCheckAt, setLastPayoutCheckAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const [demo, setDemo] = useState<{
    router?: { configured: boolean; address?: string; usdmBalance?: string | null };
    workers?: { worker1Configured: boolean; worker2Configured: boolean };
    celoscanBaseUrl?: string;
  } | null>(null);

  function shortHex(hex: string, opts?: { head?: number; tail?: number }) {
    const head = opts?.head ?? 6;
    const tail = opts?.tail ?? 4;
    if (!hex) return hex;
    if (hex.length <= head + tail + 2) return hex;
    return `${hex.slice(0, head + 2)}…${hex.slice(-tail)}`;
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied((prev) => (prev === text ? null : prev)), 1200);
    } catch {
      // ignore
    }
  }

  async function refresh() {
    const res = await fetch(`/api/tasks/${params.id}`, { cache: "no-store" });
    const data = await res.json();
    setTask(data.task);
    setWorker(data.worker ?? null);
  }

  async function refreshDemoStatus() {
    try {
      const res = await fetch(`/api/demo-status`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data?.ok) setDemo(data);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refresh();
    refreshDemoStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // new tx hash => restart polling attempts
    setAutoRefreshCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.payoutTxHash]);

  // If a payout tx exists but isn't confirmed yet, poll a few times so the demo
  // doesn't require manual clicking.
  useEffect(() => {
    if (!task?.payoutTxHash) return;
    if (task.payoutReceiptFound) return;
    if (autoRefreshCount >= 8) return;

    const t = setTimeout(async () => {
      await refreshPayout({ silent: true });
      setAutoRefreshCount((c) => c + 1);
    }, 6000);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.payoutTxHash, task?.payoutReceiptFound, autoRefreshCount]);

  async function act(path: string, body?: any) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/tasks/${params.id}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        const msg = typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? data);
        setErr(msg);
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function refreshPayout(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;
    if (!silent) setBusy(true);
    setPollingPayout(true);
    setErr(null);
    try {
      const res = await fetch(`/api/tasks/${params.id}/refresh-payout`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        // During background polling we avoid spamming the UI with transient errors.
        if (!silent) {
          const msg = typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? data);
          setErr(msg);
        }
      }
      setLastPayoutCheckAt(Date.now());
      await refresh();
    } finally {
      setPollingPayout(false);
      if (!silent) setBusy(false);
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

  const demoRouterReady = !!demo?.router?.configured;

  const requiredWorkerEnv: null | { key: "WORKER_ADDRESS" | "WORKER2_ADDRESS"; label: string } =
    task.skill === "translate" || task.skill === "summarize"
      ? { key: "WORKER_ADDRESS", label: "Polyglot Worker" }
      : task.skill === "onchain-research" || task.skill === "celoscan"
        ? { key: "WORKER2_ADDRESS", label: "Onchain Researcher" }
        : null;

  const requiredWorkerReady =
    !demo || !requiredWorkerEnv
      ? true
      : requiredWorkerEnv.key === "WORKER_ADDRESS"
        ? !!demo.workers?.worker1Configured
        : !!demo.workers?.worker2Configured;

  const payoutAmountUsdM = Math.max(1, Number(task.budgetUsd || "1"));

  const routerUsdmBal = demo?.router?.usdmBalance ? BigInt(demo.router.usdmBalance) : null;
  const requiredPayoutWei = BigInt(payoutAmountUsdM) * 10n ** 18n;
  const routerHasEnoughUsdm = routerUsdmBal === null ? true : routerUsdmBal >= requiredPayoutWei;

  const approveDisabled =
    busy || task.status === "APPROVED" || !!task.payoutTxHash || !demoRouterReady || !routerHasEnoughUsdm;

  const nextAction: null | { key: "route" | "submit" | "approve" | "refresh"; label: string; hint: string } =
    !task.workerAgentId
      ? { key: "route", label: "Route to agent", hint: "Step 1/3 — assign this task to a worker agent." }
      : task.status !== "SUBMITTED" && task.status !== "APPROVED"
        ? { key: "submit", label: "Submit work", hint: "Step 2/3 — add the agent output so it can be approved." }
        : !task.payoutTxHash
          ? { key: "approve", label: "Approve + pay", hint: "Step 3/3 — trigger the on-chain USDm transfer + get a tx link." }
          : task.payoutReceiptFound
            ? null
            : { key: "refresh", label: "Refresh payout status", hint: "Checking finality — explorer + balances update once confirmed." };

  function ctaStyle(active: boolean) {
    return active
      ? {
          border: "1px solid #111",
          background: "#111",
          color: "#fff",
          fontWeight: 800,
        }
      : {
          border: "1px solid #ddd",
          background: "#fff",
          color: "#111",
        };
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/tasks">← Tasks</Link>
        <h1 style={{ fontSize: 24 }}>{task.title}</h1>
      </div>

      {demo ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ddd",
            background: demoRouterReady ? "#f6fffb" : "#fff8f1",
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <b>Demo readiness</b>
              <div style={{ marginTop: 4, color: demoRouterReady ? "#0a7" : "#a60" }}>
                router wallet: <b>{demoRouterReady ? "configured" : "missing env var"}</b>
              </div>

              <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: demo.workers?.worker1Configured ? "#0a7" : "#a60" }}>
                  worker1 (WORKER_ADDRESS): <b>{demo.workers?.worker1Configured ? "configured" : "missing"}</b>
                </span>
                <span style={{ color: demo.workers?.worker2Configured ? "#0a7" : "#a60" }}>
                  worker2 (WORKER2_ADDRESS): <b>{demo.workers?.worker2Configured ? "configured" : "missing"}</b>
                </span>
                {requiredWorkerEnv && !requiredWorkerReady ? (
                  <span style={{ color: "#b00" }}>
                    Required for this task: <b>{requiredWorkerEnv.label}</b>
                  </span>
                ) : null}
              </div>
              {demo.router?.address ? (
                <div style={{ marginTop: 4, color: "#555", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span>
                    router address:{" "}
                    <code title={demo.router.address}>{shortHex(demo.router.address)}</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(demo.router!.address!)}
                    disabled={busy}
                    style={{ fontSize: 12, padding: "4px 8px" }}
                    title="Copy address"
                  >
                    {copied === demo.router.address ? "Copied" : "Copy"}
                  </button>
                  <a
                    href={`${demo.celoscanBaseUrl}/address/${demo.router.address}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Celoscan
                  </a>
                </div>
              ) : null}
              {demo.router?.usdmBalance ? (
                <div style={{ marginTop: 4, color: "#555" }}>
                  router USDm balance: <b>{formatUnits(BigInt(demo.router.usdmBalance), 18)}</b>
                </div>
              ) : null}
              {demo.router?.usdmBalance && !routerHasEnoughUsdm ? (
                <div style={{ marginTop: 6, color: "#b00" }}>
                  Not enough USDm to pay <b>{payoutAmountUsdM} USDm</b> for this task. Fund/mint USDm to the router wallet, then
                  click <b>Refresh readiness</b>.
                </div>
              ) : null}
              {!demoRouterReady ? (
                <div style={{ marginTop: 6, color: "#555" }}>
                  Set <code>ROUTER_PRIVATE_KEY</code> (preferred) or <code>FUNDER_PRIVATE_KEY</code> in
                  Vercel env vars (funded test wallet only).
                </div>
              ) : null}

              {requiredWorkerEnv && !requiredWorkerReady ? (
                <div style={{ marginTop: 6, color: "#555" }}>
                  This task needs <code>{requiredWorkerEnv.key}</code> set in Vercel env vars so the demo can route + pay a real
                  worker address.
                </div>
              ) : null}
            </div>
            <button disabled={busy} onClick={refreshDemoStatus}>
              Refresh readiness
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, color: "#555", fontSize: 13 }}>
        skill: <b>{task.skill}</b> • budget: <b>{task.budgetUsd} USDm</b> • status:{" "}
        <b>{task.status}</b>
      </div>

      {nextAction ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.15)",
            fontSize: 13,
            color: "#e4e4e7",
          }}
        >
          <div style={{ fontWeight: 800 }}>Suggested next: {nextAction.label}</div>
          <div style={{ marginTop: 4, color: "#a1a1aa" }}>{nextAction.hint}</div>
        </div>
      ) : null}

      <pre
        style={{
          marginTop: 12,
          whiteSpace: "pre-wrap",
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 12,
        }}
      >
        {task.description}
      </pre>

      {task.workerAgentId ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#333" }}>
          <div>
            routed to: <b>{worker?.name ?? task.workerAgentId}</b>
            <span style={{ color: "#666" }}> ({task.workerAgentId})</span>
          </div>
          {worker?.address ? (
            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", color: "#555" }}>
              <span>
                worker address: <code title={worker.address}>{shortHex(worker.address)}</code>
              </span>
              <button
                type="button"
                onClick={() => copy(worker.address)}
                disabled={busy}
                style={{ fontSize: 12, padding: "4px 8px" }}
                title="Copy worker address"
              >
                {copied === worker.address ? "Copied" : "Copy"}
              </button>
              <a
                href={`${demo?.celoscanBaseUrl ?? "https://sepolia.celoscan.io"}/address/${worker.address}`}
                target="_blank"
                rel="noreferrer"
              >
                View worker on Celoscan
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {task.payoutTxHash ? (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span>
              payout tx:{" "}
              <code title={task.payoutTxHash}>{shortHex(task.payoutTxHash)}</code>
            </span>
            <button
              type="button"
              onClick={() => copy(task.payoutTxHash!)}
              disabled={busy}
              style={{ fontSize: 12, padding: "4px 8px" }}
              title="Copy tx hash"
            >
              {copied === task.payoutTxHash ? "Copied" : "Copy"}
            </button>
          </div>
          <div style={{ marginTop: 4, color: task.payoutReceiptFound ? "#0a7" : "#a60" }}>
            status: <b>{task.payoutReceiptFound ? "confirmed" : "pending"}</b>
            {!task.payoutReceiptFound ? (
              <span style={{ color: "#666" }}>
                {" "}(auto-checking confirmation… {autoRefreshCount + 1}/8)
                {lastPayoutCheckAt ? (
                  <span style={{ color: "#777" }}>
                    {" "}· last check {Math.round((Date.now() - lastPayoutCheckAt) / 1000)}s ago
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href={`${demo?.celoscanBaseUrl ?? "https://sepolia.celoscan.io"}/tx/${task.payoutTxHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Celoscan
            </a>
            <a
              href={`${demo?.celoscanBaseUrl ?? "https://sepolia.celoscan.io"}/address/${CELO_SEPOLIA_USDM}`}
              target="_blank"
              rel="noreferrer"
              title="USDm token contract"
            >
              USDm contract
            </a>
          </div>

          <div style={{ marginTop: 8, padding: 10, borderRadius: 12, border: "1px solid #eee", background: "#fafafa" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Payment summary</div>
            <div style={{ color: "#333" }}>
              amount: <b>{payoutAmountUsdM} USDm</b>
            </div>
            {task.payoutFromAddress ? (
              <div style={{ marginTop: 4, color: "#555" }}>
                from (router): <code title={task.payoutFromAddress}>{shortHex(task.payoutFromAddress)}</code>
              </div>
            ) : null}
            {worker?.address ? (
              <div style={{ marginTop: 4, color: "#555" }}>
                to (worker): <code title={worker.address}>{shortHex(worker.address)}</code>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {task.payoutFromBalanceBefore && task.payoutFromBalanceAfter ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#333" }}>
          <div>
            router balance (USDm):{" "}
            <b>
              {formatUnits(BigInt(task.payoutFromBalanceBefore), 18)} →{" "}
              {formatUnits(BigInt(task.payoutFromBalanceAfter), 18)}
            </b>
            {task.payoutFromAddress ? (
              <span style={{ color: "#666" }}> ({task.payoutFromAddress})</span>
            ) : null}
          </div>
          {task.payoutToBalanceBefore && task.payoutToBalanceAfter ? (
            <div style={{ marginTop: 4 }}>
              worker balance (USDm):{" "}
              <b>
                {formatUnits(BigInt(task.payoutToBalanceBefore), 18)} →{" "}
                {formatUnits(BigInt(task.payoutToBalanceAfter), 18)}
              </b>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          disabled={busy || !requiredWorkerReady}
          onClick={() => act("route-to-agent")}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            cursor: busy || !requiredWorkerReady ? "not-allowed" : "pointer",
            ...ctaStyle(nextAction?.key === "route"),
          }}
          title={
            !requiredWorkerReady && requiredWorkerEnv
              ? `Missing ${requiredWorkerEnv.key} env var. Configure it in Vercel so routing selects a worker with a real onchain address.`
              : undefined
          }
        >
          Route to agent
        </button>
        <button
          disabled={busy}
          onClick={() =>
            act("submit", {
              output:
                "Demo submission: translation output would be here. (Replace with real agent output)",
            })
          }
          style={{ padding: "10px 12px", borderRadius: 12, cursor: "pointer", ...ctaStyle(nextAction?.key === "submit") }}
        >
          Submit work
        </button>
        <button
          disabled={approveDisabled}
          onClick={() => act("approve")}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            cursor: approveDisabled ? "not-allowed" : "pointer",
            ...ctaStyle(nextAction?.key === "approve"),
          }}
          title={
            !demoRouterReady
              ? "Missing ROUTER_PRIVATE_KEY (or FUNDER_PRIVATE_KEY fallback) in env vars. Configure a funded test wallet to enable payouts."
              : !routerHasEnoughUsdm
                ? "Router USDm balance is too low for this payout. Mint/fund USDm and refresh readiness."
                : task.status === "APPROVED" || task.payoutTxHash
                  ? "This task was already approved (payout already initiated). Create a new task to run the demo again."
                  : undefined
          }
        >
          Approve + pay
        </button>
        {task.payoutTxHash ? (
          <button
            disabled={busy || pollingPayout}
            onClick={() => refreshPayout()}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              cursor: busy || pollingPayout ? "not-allowed" : "pointer",
              ...ctaStyle(nextAction?.key === "refresh"),
            }}
          >
            {pollingPayout ? "Checking payout…" : "Refresh payout status"}
          </button>
        ) : null}
        <button
          disabled={busy}
          onClick={refresh}
          style={{ padding: "10px 12px", borderRadius: 12, cursor: busy ? "not-allowed" : "pointer" }}
        >
          Refresh
        </button>
      </div>

      {err ? (
        <pre style={{ marginTop: 12, color: "#b00", whiteSpace: "pre-wrap" }}>{err}</pre>
      ) : null}

      <p style={{ marginTop: 18, fontSize: 12, color: "#666" }}>
        Note: Approve triggers an on-chain USDm (Celo Sepolia) transfer from the
        router demo wallet (ROUTER_PRIVATE_KEY preferred; FUNDER_PRIVATE_KEY fallback)
        to the routed worker address.
      </p>
    </main>
  );
}
