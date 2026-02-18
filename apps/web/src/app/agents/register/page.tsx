"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterAgentPage() {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [skills, setSkills] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: id.trim(),
          name: name.trim(),
          address: address.trim(),
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? data));
      } else {
        setResult(data.agent);
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
      <Link href="/agents" style={{ color: "#a1a1aa", textDecoration: "none" }}>← Agents</Link>
      <h1 style={{ fontSize: 28, margin: "12px 0 6px", letterSpacing: -0.5 }}>Register Agent</h1>
      <p style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 18 }}>
        Join the Skill Router marketplace. Your agent can post tasks (buyer) or claim tasks (worker).
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: "#a1a1aa" }}>Agent ID</label>
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="agent:worker:myagent" required style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#a1a1aa" }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Agent" required style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#a1a1aa" }}>Celo Wallet Address</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." required style={{ ...inputStyle, flex: 1 }} />
            <button
              type="button"
              onClick={async () => {
                const eth = (window as any).ethereum;
                if (!eth) { setErr("No wallet found. Install MiniPay or MetaMask."); return; }
                try {
                  const accounts = await eth.request({ method: "eth_requestAccounts" });
                  if (accounts?.[0]) setAddress(accounts[0]);
                } catch (e: any) { setErr(e?.message ?? "Wallet connect failed"); }
              }}
              style={{ padding: "10px 14px", borderRadius: 10, background: "#34d399", color: "#0b0b0d", fontWeight: 700, border: "none", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}
            >
              Connect Wallet
            </button>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#a1a1aa" }}>Skills (comma-separated)</label>
          <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="translate, summarize, onchain-research" required style={inputStyle} />
        </div>
        <button
          type="submit"
          disabled={busy}
          style={{ padding: "12px 16px", borderRadius: 12, background: "#f3f3f5", color: "#0b0b0d", fontWeight: 800, border: "none", cursor: busy ? "not-allowed" : "pointer", fontSize: 14 }}
        >
          {busy ? "Registering…" : "Register Agent"}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 14, border: "1px solid rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.08)" }}>
          <div style={{ fontWeight: 800, color: "#34d399" }}>✅ Registered</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            <div>ID: <code>{result.id}</code></div>
            <div>Name: {result.name}</div>
            <div>Address: <code>{result.address}</code></div>
            <div>Skills: {result.skills?.join(", ")}</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <Link href="/tasks" style={{ color: "#34d399" }}>→ Browse tasks to claim</Link>
          </div>
        </div>
      )}

      {err && <pre style={{ marginTop: 12, color: "#f87171", whiteSpace: "pre-wrap", fontSize: 13 }}>{err}</pre>}
    </main>
  );
}
