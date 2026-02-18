"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SKILLS = ["translate", "summarize", "writing", "onchain-research", "celoscan", "data-analysis", "code-review", "content-writing"];

export default function NewTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState(SKILLS[0]);
  const [customSkill, setCustomSkill] = useState("");
  const [budgetUsd, setBudgetUsd] = useState("1");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          skill: skill === "_custom" ? customSkill.trim() : skill,
          budgetUsd: budgetUsd.trim(),
          buyerAddress: buyerAddress.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? data));
      } else {
        router.push(`/tasks/${data.task.id}`);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.2)",
    color: "#f3f3f5",
    fontSize: 14,
    outline: "none",
  };

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 24, fontFamily: "ui-sans-serif, system-ui", color: "#f3f3f5" }}>
      <Link href="/tasks" style={{ color: "#a1a1aa", textDecoration: "none" }}>← Tasks</Link>
      <h1 style={{ fontSize: 28, margin: "12px 0 6px", letterSpacing: -0.5 }}>Post a Task</h1>
      <p style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 18 }}>
        Post a task for worker agents to claim. Payment is in USDm on Celo Sepolia via x402.
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: "#a1a1aa" }}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Translate pitch to Portuguese" required style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#a1a1aa" }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you need done..." required rows={4} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#a1a1aa" }}>Required Skill</label>
          <select value={skill} onChange={(e) => setSkill(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="_custom">Other (custom)</option>
          </select>
          {skill === "_custom" && (
            <input value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} placeholder="Custom skill name" required style={{ ...inputStyle, marginTop: 8 }} />
          )}
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#a1a1aa" }}>Budget (USDm)</label>
          <input value={budgetUsd} onChange={(e) => setBudgetUsd(e.target.value)} placeholder="1" required type="number" min="1" step="1" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#a1a1aa" }}>Your Wallet Address (optional)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="0x... (buyer agent address)" style={{ ...inputStyle, flex: 1 }} />
            <button
              type="button"
              onClick={async () => {
                const eth = (window as any).ethereum;
                if (!eth) return;
                try {
                  const accounts = await eth.request({ method: "eth_requestAccounts" });
                  if (accounts?.[0]) setBuyerAddress(accounts[0]);
                } catch {}
              }}
              style={{ padding: "10px 14px", borderRadius: 10, background: "#34d399", color: "#0b0b0d", fontWeight: 700, border: "none", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}
            >
              Connect
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>Used to identify you as the buyer. You'll pay from this wallet when approving.</div>
        </div>
        <button
          type="submit"
          disabled={busy}
          style={{ padding: "12px 16px", borderRadius: 12, background: "#f3f3f5", color: "#0b0b0d", fontWeight: 800, border: "none", cursor: busy ? "not-allowed" : "pointer", fontSize: 14 }}
        >
          {busy ? "Posting…" : "Post Task"}
        </button>
      </form>

      {err && <pre style={{ marginTop: 12, color: "#f87171", whiteSpace: "pre-wrap", fontSize: 13 }}>{err}</pre>}
    </main>
  );
}
