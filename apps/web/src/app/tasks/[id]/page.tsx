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

  payoutFromAddress?: string;
  payoutFromBalanceBefore?: string;
  payoutFromBalanceAfter?: string;
  payoutToBalanceBefore?: string;
  payoutToBalanceAfter?: string;
};

export default function TaskPage({ params }: { params: { id: string } }) {
  const [task, setTask] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/tasks/${params.id}`, { cache: "no-store" });
    const data = await res.json();
    setTask(data.task);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setErr(data.error ? JSON.stringify(data.error) : JSON.stringify(data));
      }
      await refresh();
    } finally {
      setBusy(false);
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

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/tasks">← Tasks</Link>
        <h1 style={{ fontSize: 24 }}>{task.title}</h1>
      </div>

      <div style={{ marginTop: 12, color: "#555", fontSize: 13 }}>
        skill: <b>{task.skill}</b> • budget: <b>{task.budgetUsd} USDm</b> • status:{" "}
        <b>{task.status}</b>
      </div>

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
          routed to: <b>{task.workerAgentId}</b>
        </div>
      ) : null}

      {task.payoutTxHash ? (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <div>
            payout tx: <code>{task.payoutTxHash}</code>
          </div>
          <div style={{ marginTop: 6 }}>
            <a
              href={`https://sepolia.celoscan.io/tx/${task.payoutTxHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Celoscan
            </a>
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
        <button disabled={busy} onClick={() => act("route-to-agent")}>Route to agent</button>
        <button
          disabled={busy}
          onClick={() =>
            act("submit", {
              output:
                "Demo submission: translation output would be here. (Replace with real agent output)",
            })
          }
        >
          Submit work
        </button>
        <button disabled={busy} onClick={() => act("approve")}>Approve + pay</button>
        <button disabled={busy} onClick={refresh}>Refresh</button>
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
