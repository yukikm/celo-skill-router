"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Translate this text");
  const [description, setDescription] = useState(
    "Translate: 'Hello from Celo agents' to Spanish.",
  );
  const [skill, setSkill] = useState("translate");
  const [budgetUsd, setBudgetUsd] = useState("1");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description, skill, budgetUsd }),
    });

    if (!res.ok) {
      setError(await res.text());
      return;
    }

    const data = await res.json();
    router.push(`/tasks/${data.task.id}`);
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/tasks">← Tasks</Link>
        <h1 style={{ fontSize: 24 }}>Create task</h1>
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label>
          <div style={{ fontSize: 12, color: "#666" }}>Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        <label>
          <div style={{ fontSize: 12, color: "#666" }}>Description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <div style={{ fontSize: 12, color: "#666" }}>Skill</div>
            <input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />
          </label>
          <label>
            <div style={{ fontSize: 12, color: "#666" }}>Budget (USDm, whole number)</div>
            <input
              value={budgetUsd}
              onChange={(e) => setBudgetUsd(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />
          </label>
        </div>

        {error ? (
          <pre style={{ whiteSpace: "pre-wrap", color: "#b00", fontSize: 12 }}>{error}</pre>
        ) : null}

        <button
          type="submit"
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Create
        </button>
      </form>
    </main>
  );
}
