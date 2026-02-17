import Link from "next/link";

export default function DocsPage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ fontSize: 24 }}>Demo checklist (ship → test → iterate)</h1>
      </div>

      <ol style={{ marginTop: 16, lineHeight: 1.7 }}>
        <li>
          Set env vars for demo wallets:
          <pre>{`ROUTER_PRIVATE_KEY=0x...
WORKER_ADDRESS=0x...
WORKER2_ADDRESS=0x...`}</pre>
        </li>
        <li>
          Fund the router wallet on Celo Sepolia:
          <ul>
            <li>CELO for gas (faucet)</li>
            <li>USDm test tokens (optional if you have a faucet; otherwise we can
            switch to USDT Sepolia)</li>
          </ul>
        </li>
        <li>
          Run the app:
          <pre>{`cd repos/celo-tabless
pnpm install
pnpm -C apps/web dev`}</pre>
        </li>
        <li>
          Create a task → route → submit → approve+pay.
        </li>
        <li>
          Iterate:
          <ul>
            <li>Add a second worker skill</li>
            <li>Add x402 paywall (optional)</li>
            <li>Wire ERC-8004 agentId into UI</li>
          </ul>
        </li>
      </ol>

      <p style={{ marginTop: 18, fontSize: 12, color: "#666" }}>
        Notes: For hackathon submission we still need Karma project URL + ERC-8004
        agentId + SelfClaw verification link.
      </p>
    </main>
  );
}
