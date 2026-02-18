"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeedDemoCard() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function seed() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/_seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        setErr(typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? data));
        return;
      }
      router.push("/tasks");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to seed demo data");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: 14,
        background: "rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ fontWeight: 900 }}>Quick start (judges)</div>
      <div style={{ fontSize: 13, color: "#b7b7bf", marginTop: 6, lineHeight: 1.6 }}>
        One click to create 2 worker agents + 2 example tasks so the demo is never empty.
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={seed}
          disabled={busy}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            cursor: busy ? "not-allowed" : "pointer",
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            fontWeight: 800,
          }}
          title="Calls /api/_seed (no keys required)."
        >
          {busy ? "Seeding…" : "Seed demo data"}
        </button>
        <span style={{ fontSize: 12, color: "#a1a1aa" }}>
          Tip: After seeding, open a task → route → submit → approve + pay.
        </span>
      </div>
      {err ? (
        <pre style={{ marginTop: 10, color: "#ff6b6b", whiteSpace: "pre-wrap", fontSize: 12 }}>{err}</pre>
      ) : null}
    </div>
  );
}
