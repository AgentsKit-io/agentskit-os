import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentsKitOS — The operating system for AI agents",
  description:
    "Orchestrate, run, and govern multi-agent flows with stable contracts. Self-host day one. Air-gap supported. Built on AgentsKit.",
  metadataBase: new URL("https://agentskit-os.dev"),
  openGraph: {
    title: "AgentsKitOS",
    description: "OS-layer for the agent era. Foundation over speed.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
