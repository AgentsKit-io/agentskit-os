"use client";

export function FlowSVG() {
  return (
    <section className="relative bg-surface-alt py-24 md:py-32">
      <div className="container-x">
        <div className="text-center mb-14">
          <p className="text-eyebrow uppercase tracking-widest text-accent">Flow engine</p>
          <h2 className="mt-3 text-h2 text-balance">DAG-native. Durable. Time-travel debuggable.</h2>
          <p className="mx-auto mt-5 max-w-xl text-ink-muted">
            Compose agents into flows: compare, vote, debate, auction, blackboard. Pause for humans.
            Branch from any past step.
          </p>
        </div>

        <div className="mx-auto max-w-4xl rounded-3xl border border-line bg-white p-6 md:p-10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.15)]">
          <svg
            viewBox="0 0 800 360"
            className="w-full h-auto"
            role="img"
            aria-label="Animated agent flow DAG"
          >
            <defs>
              <linearGradient id="edge" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#1d1d1f" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#0071e3" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#1d1d1f" stopOpacity="0.15" />
              </linearGradient>
              <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>

            {/* edges */}
            <g
              fill="none"
              strokeWidth="1.5"
              stroke="url(#edge)"
              strokeDasharray="4 4"
              className="animate-flow-dash"
            >
              <path d="M150 180 C 240 180, 260 90, 350 90" />
              <path d="M150 180 C 240 180, 260 270, 350 270" />
              <path d="M450 90 C 540 90, 560 180, 650 180" />
              <path d="M450 270 C 540 270, 560 180, 650 180" />
            </g>

            {/* trigger */}
            <Node x={80} y={180} label="Trigger" sub="webhook" tone="muted" />

            {/* parallel agents */}
            <Node x={400} y={90} label="Researcher" sub="claude-opus" tone="ink" pulse />
            <Node x={400} y={270} label="Critic" sub="gpt-4.1" tone="ink" pulse delay="0.6s" />

            {/* aggregate */}
            <Node x={700} y={180} label="Vote" sub="quorum=2" tone="accent" pulse delay="1.2s" />

            {/* HITL badge */}
            <g transform="translate(400, 180)">
              <rect x="-50" y="-14" width="100" height="28" rx="14" fill="#fff" stroke="#d2d2d7" />
              <text x="0" y="4" textAnchor="middle" fontSize="11" fill="#6e6e73" fontFamily="-apple-system">
                HITL gate
              </text>
            </g>
          </svg>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[12px] text-ink-muted">
            <Tag>compare</Tag>
            <Tag>vote</Tag>
            <Tag>debate</Tag>
            <Tag>auction</Tag>
            <Tag>blackboard</Tag>
            <Tag>checkpoint</Tag>
            <Tag>replay</Tag>
            <Tag>branch-from-step</Tag>
          </div>
        </div>
      </div>
    </section>
  );
}

function Node({
  x,
  y,
  label,
  sub,
  tone = "ink",
  pulse = false,
  delay,
}: {
  x: number;
  y: number;
  label: string;
  sub: string;
  tone?: "ink" | "accent" | "muted";
  pulse?: boolean;
  delay?: string;
}) {
  const fill = tone === "accent" ? "#0071e3" : tone === "muted" ? "#f5f5f7" : "#1d1d1f";
  const text = tone === "muted" ? "#1d1d1f" : "#ffffff";
  const subColor = tone === "muted" ? "#6e6e73" : "rgba(255,255,255,0.7)";
  return (
    <g transform={`translate(${x}, ${y})`}>
      {pulse && (
        <circle
          r="46"
          fill={tone === "accent" ? "#0071e3" : "#1d1d1f"}
          opacity="0.12"
          className="animate-flow-pulse"
          style={{ animationDelay: delay }}
        />
      )}
      <rect x="-60" y="-28" width="120" height="56" rx="14" fill={fill} stroke="#d2d2d7" strokeOpacity={tone === "muted" ? 1 : 0} />
      <text x="0" y="-4" textAnchor="middle" fontSize="13" fontWeight="600" fill={text} fontFamily="-apple-system">
        {label}
      </text>
      <text x="0" y="14" textAnchor="middle" fontSize="10.5" fill={subColor} fontFamily="SF Mono, monospace">
        {sub}
      </text>
    </g>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-surface-alt px-2.5 py-1 font-mono">
      {children}
    </span>
  );
}
