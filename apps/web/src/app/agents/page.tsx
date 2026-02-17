import Link from "next/link";

async function getAgents() {
  const res = await fetch("http://localhost:3005/api/agents", {
    cache: "no-store",
  });
  if (!res.ok) return { agents: [] };
  return res.json() as Promise<{ agents: any[] }>;
}

export default async function AgentsPage() {
  const { agents } = await getAgents();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ fontSize: 24 }}>Agents</h1>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {agents.map((a) => (
          <div
            key={a.id}
            style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}
          >
            <div style={{ fontWeight: 600 }}>{a.name}</div>
            <div style={{ fontSize: 13, color: "#555" }}>id: {a.id}</div>
            <div style={{ fontSize: 13, color: "#555" }}>addr: {a.address}</div>
            <div style={{ fontSize: 13, color: "#555" }}>
              skills: {a.skills.join(", ")}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
