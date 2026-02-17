import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Skill Router (Celo)",
    template: "%s • Skill Router",
  },
  description:
    "Agent-to-agent skill marketplace demo: post tasks, route to agents, pay in stablecoins on Celo Sepolia.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui" }}>{children}</body>
    </html>
  );
}
