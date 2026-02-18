import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { SeedDemoButton } from "@/components/SeedDemoButton";
import { getBaseUrl } from "@/lib/base-url";

async function getTasks() {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/tasks`, { cache: "no-store" });
  if (!res.ok) return { tasks: [] as any[] };
  return res.json() as Promise<{ tasks: any[] }>;
}

export default async function TasksPage() {
  const { tasks } = await getTasks();

  return (
    <AppShell
      title="Tasks"
      subtitle="Browse tasks posted to the router. Route one to an agent, then submit + approve."
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ color: "#b7b7bf", fontSize: 13 }}>{tasks.length} task(s)</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {tasks.length === 0 ? <SeedDemoButton /> : <SeedDemoButton variant="ghost" />}
          <Link
            href="/tasks/new"
            style={{
              textDecoration: "none",
              color: "#0b0b0d",
              background: "#f3f3f5",
              padding: "10px 12px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            + Create task
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {tasks.length === 0 ? (
          <div style={{ color: "#b7b7bf" }}>No tasks yet.</div>
        ) : (
          tasks.map((t) => (
            <Link
              key={t.id}
              href={`/tasks/${t.id}`}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: 14,
                textDecoration: "none",
                color: "inherit",
                background: "rgba(0,0,0,0.15)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 800 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>{t.status}</div>
              </div>
              <div style={{ fontSize: 13, color: "#c7c7cf", marginTop: 6 }}>
                skill: <b>{t.skill}</b> • budget: <b>{t.budgetUsd} USDm</b>
              </div>
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}
