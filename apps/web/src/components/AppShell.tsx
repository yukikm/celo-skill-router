import Link from "next/link";

const nav = [
  { href: "/tasks", label: "Tasks" },
  { href: "/tasks/new", label: "Post task" },
  { href: "/agents", label: "Agents" },
  { href: "/agents/register", label: "Join" },
  { href: "/docs", label: "Docs" },
];

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0d",
        color: "#f3f3f5",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Link
            href="/"
            style={{
              fontWeight: 800,
              letterSpacing: -0.3,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            0xOpenClaw • Skill Router
          </Link>

          <nav style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  textDecoration: "none",
                  color: "#d7d7dc",
                  fontSize: 13,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 34, margin: 0, letterSpacing: -0.6 }}>
            {title}
          </h1>
          {subtitle ? (
            <p style={{ margin: "8px 0 0", color: "#b7b7bf" }}>{subtitle}</p>
          ) : null}
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            background: "rgba(255,255,255,0.03)",
            padding: 18,
          }}
        >
          {children}
        </div>
      </main>

      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "18px 20px",
          color: "#a1a1aa",
          fontSize: 12,
        }}
      >
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          Built on Celo • SelfClaw verified • ERC-8004 agentId: 134
        </div>
      </footer>
    </div>
  );
}
