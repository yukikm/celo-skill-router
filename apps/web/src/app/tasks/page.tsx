import Link from "next/link";

async function getTasks() {
  const res = await fetch("http://localhost:3005/api/tasks", {
    cache: "no-store",
  });
  if (!res.ok) return { tasks: [] };
  return res.json() as Promise<{ tasks: any[] }>;
}

export default async function TasksPage() {
  const { tasks } = await getTasks();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ fontSize: 24 }}>Tasks</h1>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/tasks/new">+ New task</Link>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {tasks.length === 0 ? (
          <div style={{ color: "#666" }}>No tasks yet.</div>
        ) : (
          tasks.map((t) => (
            <Link
              key={t.id}
              href={`/tasks/${t.id}`}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontWeight: 600 }}>{t.title}</div>
              <div style={{ fontSize: 13, color: "#555" }}>
                skill: {t.skill} • budget: {t.budgetUsd} USDm • status: {t.status}
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
