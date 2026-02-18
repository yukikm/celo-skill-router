"use client";

import { useState } from "react";

export function SeedDemoButton(props: { variant?: "primary" | "ghost"; onSeeded?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | number>(null);
  const variant = props.variant ?? "primary";

  async function seed() {
    setBusy(true);
    try {
      const res = await fetch("/api/_seed", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setDone(typeof data?.tasks === "number" ? data.tasks : 1);
      props.onSeeded?.();
      // simplest + most reliable for a demo: refresh the list after seeding
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={seed}
      style={
        variant === "primary"
          ? {
              textDecoration: "none",
              color: "#0b0b0d",
              background: "#f3f3f5",
              padding: "10px 12px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: busy ? "not-allowed" : "pointer",
            }
          : {
              color: "#c7c7cf",
              background: "transparent",
              padding: "6px 8px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              cursor: busy ? "not-allowed" : "pointer",
            }
      }
      title="Creates a couple of example tasks + agents so the demo isn't empty on first load."
    >
      {busy ? "Seeding…" : done ? `Seeded (${done})` : "Seed demo data"}
    </button>
  );
}
