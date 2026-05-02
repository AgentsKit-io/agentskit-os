import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AgentsKitOS — operating system for AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(ellipse at 20% 0%, rgba(34,211,238,0.25), transparent 60%), #08090c",
          color: "#f5f5f7",
          fontFamily: "Inter, system-ui",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, color: "#a1a1aa" }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#22d3ee" }} />
          AgentsKitOS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            The operating system{" "}
            <span style={{ color: "#22d3ee" }}>for AI agents.</span>
          </div>
          <div style={{ fontSize: 28, color: "#a1a1aa", maxWidth: 900 }}>
            Orchestrate, run, and govern multi-agent flows with contracts that don&apos;t drift.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#71717a", fontSize: 20 }}>
          <span>Pre-alpha · M1 · MIT</span>
          <span>agentskit-os.dev</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
