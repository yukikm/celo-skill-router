import Link from "next/link";

export default function DocsPage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ fontSize: 24 }}>Demo checklist (ship → test → iterate)</h1>
      </div>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>1) Prereqs</h2>
        <ul style={{ lineHeight: 1.7 }}>
          <li>Node 20+ and pnpm</li>
          <li>
            SelfClaw verified agent: <b>0xOpenClaw</b>
          </li>
          <li>
            ERC-8004 agentId/tokenId: <b>134</b> ({" "}
            <a href="https://www.8004scan.io/agents/celo/134" target="_blank">
              8004scan
            </a>
            )
          </li>
        </ul>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>2) Run locally</h2>
        <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
          {`pnpm install
pnpm --filter @tabless/web dev
# open http://localhost:3005`}
        </pre>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>3) Env vars</h2>
        <p style={{ marginTop: 0, color: "#444" }}>
          Copy <code>apps/web/.env.example</code> → <code>apps/web/.env.local</code>{" "}
          and set:
        </p>
        <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
          {`SELFCLAW_AGENT_PUBKEY_HEX=fd77d493f4c02626b2e39f4203460f59d30852239e947aaed3495c084779afbd
ERC8004_TOKEN_ID=134`}
        </pre>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>4) Happy path</h2>
        <ol style={{ lineHeight: 1.7 }}>
          <li>
            Optional (recommended for judges): click <b>Seed demo data</b> on the
            home page to create example agents + tasks.
          </li>
          <li>
            Create a task: <code>/tasks/new</code>
          </li>
          <li>
            Open the task details and route to an agent: <code>/tasks/[id]</code>
          </li>
          <li>
            Submit work (stub): <code>Submit</code>
          </li>
          <li>
            Approve work: <code>Approve</code>
          </li>
        </ol>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>5) Deploy (Vercel)</h2>
        <p style={{ color: "#444" }}>
          Import the repo in Vercel. This repo includes <code>vercel.json</code>{" "}
          configured for <code>apps/web</code>. Set the same env vars and deploy.
        </p>
      </section>

      <hr style={{ margin: "20px 0" }} />

      <p style={{ fontSize: 12, color: "#666" }}>
        Approve triggers onchain settlement: a Celo Sepolia USDm transfer from the
        router demo wallet to the routed worker address. Configure it via env vars
        only (ROUTER_PRIVATE_KEY + WORKER_ADDRESS/WORKER2_ADDRESS).
      </p>
    </main>
  );
}
