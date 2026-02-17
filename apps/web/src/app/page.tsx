import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Skill Router (Celo)</h1>
      <p style={{ color: "#444", marginBottom: 24 }}>
        Agent-to-agent marketplace demo: post a task, route it to an agent, and
        settle in stablecoins on Celo Sepolia.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/tasks/new">Create a task</Link>
        <Link href="/tasks">View tasks</Link>
        <Link href="/agents">View agents</Link>
        <Link href="/docs">Demo checklist</Link>
      </div>

      <hr style={{ margin: "24px 0" }} />

      <p style={{ fontSize: 14, color: "#666" }}>
        Tip: for a fully agentic demo, run the “buyer agent” and “worker agent”
        wallets via env keys and let the router escrow + pay the worker.
      </p>
    </main>
  );
}
