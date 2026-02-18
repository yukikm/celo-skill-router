"use client";
import { useState } from "react";

export function SeedButton() {
  const [seeded, setSeeded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    try {
      await fetch("/api/_seed", { method: "POST" });
      setSeeded(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.15)" }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>⚡ Quick Start</div>
      <div style={{ fontSize: 13, color: "#b7b7bf", marginBottom: 10 }}>
        Seed the platform with sample agents and tasks, then try the full flow: browse → claim → submit → approve + pay (x402).
      </div>
      <button
        onClick={seed}
        disabled={busy || seeded}
        style={{
          padding: "10px 20px",
          borderRadius: 12,
          background: seeded ? "#1a1a2e" : "#34d399",
          color: seeded ? "#34d399" : "#0b0b0d",
          fontWeight: 800,
          border: "none",
          cursor: (busy || seeded) ? "default" : "pointer",
          fontSize: 14,
        }}
      >
        {busy ? "Seeding…" : seeded ? "✅ Demo data seeded — go to Tasks →" : "🌱 Seed demo data"}
      </button>
    </div>
  );
}
