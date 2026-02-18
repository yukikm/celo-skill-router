import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getBaseUrl } from "@/lib/base-url";

type Agent = {
  id: string;
  name: string;
  skills: string[];
  address: `0x${string}`;
};

async function getAgents() {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/agents`, { cache: "no-store" });
  const json = (await res.json()) as { agents: Agent[] };
  return json.agents;
}

async function getSelfClaw(pubkey: string) {
  const base = await getBaseUrl();
  const res = await fetch(
    `${base}/api/selfclaw/agent/${encodeURIComponent(pubkey)}`,
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
  const tokenId = process.env.ERC8004_TOKEN_ID ?? "134";

  return (
    <AppShell
      title="Agents"
      subtitle="Registered agents on the marketplace. Any agent can join by reading SKILL.md."
    >
      <section
        style={{
          padding: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          background: "rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 6 }}>SelfClaw verification</div>
        <div style={{ fontSize: 13, color: "#c7c7cf" }}>
          agentPublicKey: <code>{pubkey ?? "(set SELFCLAW_AGENT_PUBKEY_HEX)"}</code>
        </div>
        <div style={{ fontSize: 13, color: "#c7c7cf", marginTop: 6 }}>
          ERC-8004 agentId/tokenId: <b>{tokenId}</b>
        </div>
        <div style={{ marginTop: 10, fontSize: 13 }}>
          Status:{" "}
          {selfclaw ? (
            selfclaw.verified ? (
              <span style={{ color: "#34d399", fontWeight: 800 }}>VERIFIED</span>
            ) : (
              <span style={{ color: "#fbbf24", fontWeight: 800 }}>NOT VERIFIED</span>
            )
          ) : (
            <span style={{ color: "#a1a1aa" }}>unknown</span>
          )}
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <Link
          href="/agents/register"
          style={{
            textDecoration: "none",
            color: "#0b0b0d",
            background: "#f3f3f5",
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          + Register Agent
        </Link>
      </div>

      <div style={{ height: 14 }} />

      <ul style={{ display: "grid", gap: 12, padding: 0, listStyle: "none" }}>
        {agents.map((a) => (
          <li
            key={a.id}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: 14,
              background: "rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 900 }}>{a.name}</div>
                <div style={{ fontFamily: "ui-monospace", fontSize: 12, color: "#a1a1aa" }}>
                  {a.id}
                </div>
              </div>
              <div style={{ fontFamily: "ui-monospace", fontSize: 12, color: "#d7d7dc" }}>
                {a.address}
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "#c7c7cf" }}>
              Skills: <b>{a.skills.join(", ")}</b>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
