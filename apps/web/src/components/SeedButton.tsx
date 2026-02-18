"use client";
import { useState } from "react";
import Link from "next/link";

export function SeedButton() {
  const [seeded, setSeeded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [walletAddr, setWalletAddr] = useState<string | null>(null);

  async function connectAndSeed() {
    setBusy(true);
    try {
      let address = "";
      const eth = (window as any).ethereum;
      if (eth) {
        try {
          const accounts = await eth.request({ method: "eth_requestAccounts" });
          if (accounts?.[0]) {
            address = accounts[0];
            setWalletAddr(address);
            // Switch to Celo Sepolia
            try {
              await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7ac" }] });
            } catch (e: any) {
              if (e.code === 4902) {
                await eth.request({
                  method: "wallet_addEthereumChain",
                  params: [{ chainId: "0xaa36a7ac", chainName: "Celo Sepolia", nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 }, rpcUrls: ["https://forno.celo-sepolia.celo-testnet.org"], blockExplorerUrls: ["https://sepolia.celoscan.io"] }],
                });
              }
            }
          }
        } catch {}
      }
      await fetch("/api/_seed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      setSeeded(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.15)" }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>⚡ Quick Start — Try It Now</div>
      <div style={{ fontSize: 13, color: "#b7b7bf", marginBottom: 10 }}>
        Connect your wallet and seed the platform. Then walk through the full flow: register → post task → claim → submit → approve + pay (real USDm on Celo Sepolia).
      </div>
      {!seeded ? (
        <button
          onClick={connectAndSeed}
          disabled={busy}
          style={{ padding: "12px 24px", borderRadius: 12, background: "#34d399", color: "#0b0b0d", fontWeight: 800, border: "none", cursor: busy ? "not-allowed" : "pointer", fontSize: 14 }}
        >
          {busy ? "Connecting…" : "🔗 Connect Wallet + Seed Demo"}
        </button>
      ) : (
        <div style={{ fontSize: 13 }}>
          <div style={{ color: "#34d399", fontWeight: 800, marginBottom: 8 }}>✅ Ready! {walletAddr && `Connected: ${walletAddr.slice(0, 8)}…${walletAddr.slice(-4)}`}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/tasks" style={{ padding: "8px 16px", borderRadius: 10, background: "#f3f3f5", color: "#0b0b0d", fontWeight: 700, textDecoration: "none", fontSize: 13 }}>
              Browse Tasks →
            </Link>
            <Link href="/tasks/new" style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.1)", color: "#f3f3f5", fontWeight: 700, textDecoration: "none", fontSize: 13 }}>
              Post a Task →
            </Link>
            <Link href="/agents/register" style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.1)", color: "#f3f3f5", fontWeight: 700, textDecoration: "none", fontSize: 13 }}>
              Register Agent →
            </Link>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "#a1a1aa" }}>
            💡 Need testnet USDm? Get CELO from{" "}
            <a href="https://faucet.celo.org/alfajores" target="_blank" rel="noreferrer" style={{ color: "#34d399" }}>Celo Faucet</a>
            {" "}then swap for USDm on Celo Sepolia.
          </div>
        </div>
      )}
    </div>
  );
}
