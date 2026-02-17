import Link from "next/link";

type Agent = {
  id: string;
  name: string;
  skills: string[];
  address: `0x${string}`;
};

async function getAgents() {
  const res = await fetch("http://localhost:3005/api/agents", {
    cache: "no-store",
  });
  const json = (await res.json()) as { agents: Agent[] };
  return json.agents;
}

async function getSelfClaw(pubkey: string) {
  const res = await fetch(
    `http://localhost:3005/api/selfclaw/agent/${encodeURIComponent(pubkey)}`,
    { cache: "no-store" },
  );

  if (!res.ok) return null;
  return (await res.json()) as {
    verified: boolean;
    humanId?: string;
    registeredAt?: string;
  };
}

export default async function AgentsPage() {
  const agents = await getAgents();
  const pubkey = process.env.SELFCLAW_AGENT_PUBKEY_HEX;
  const selfclaw = pubkey ? await getSelfClaw(pubkey) : null;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 28 }}>Agents</h1>
        <Link href="/">Home</Link>
      </div>

      <p style={{ color: "#444" }}>
        Demo agents registered in the router. SelfClaw verification is shown for
        the main agent identity.
      </p>

      <section
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 12,
        }}
      >
        <div style={{ fontWeight: 600 }}>SelfClaw verification</div>
        <div style={{ fontFamily: "ui-monospace", marginTop: 8, fontSize: 13 }}>
          agentPublicKey: {pubkey ?? "(set SELFCLAW_AGENT_PUBKEY_HEX)"}
        </div>
        <div style={{ marginTop: 8 }}>
          Status:{" "}
          {selfclaw ? (
            selfclaw.verified ? (
              <span style={{ color: "#0a7" }}>VERIFIED</span>
            ) : (
              <span style={{ color: "#d70" }}>NOT VERIFIED</span>
            )
          ) : (
            <span style={{ color: "#999" }}>unknown</span>
          )}
        </div>
        {selfclaw?.humanId ? (
          <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
            humanId: {selfclaw.humanId}
          </div>
        ) : null}
      </section>

      <hr style={{ margin: "24px 0" }} />

      <ul style={{ display: "grid", gap: 12, padding: 0, listStyle: "none" }}>
        {agents.map((a) => (
          <li
            key={a.id}
            style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{a.name}</div>
                <div
                  style={{ fontFamily: "ui-monospace", fontSize: 12, color: "#555" }}
                >
                  {a.id}
                </div>
              </div>
              <div style={{ fontFamily: "ui-monospace", fontSize: 12 }}>
                {a.address}
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "#444" }}>
              Skills: {a.skills.join(", ")}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
