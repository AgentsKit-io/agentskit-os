const MILESTONES = [
  { id: "M1", title: "Core schemas + CLI alpha", status: "active" },
  { id: "M2", title: "Desktop shell · FlowEditor · TraceViewer", status: "next" },
  { id: "M3", title: "Flow engine · DAG · durable · HITL", status: "planned" },
  { id: "M4", title: "Triggers · MCP bridge v2", status: "planned" },
  { id: "M5", title: "Marketplace · plugin host", status: "planned" },
  { id: "M6", title: "Observability · audit signing · vault", status: "planned" },
  { id: "M7", title: "Generative OS (NL → flow)", status: "planned" },
  { id: "M8", title: "Cloud sync · CRDT collab · 1.0", status: "planned" },
];

export function Roadmap() {
  return (
    <section id="roadmap" className="bg-surface-alt py-24 md:py-32">
      <div className="container-x">
        <div className="mb-14">
          <p className="text-eyebrow uppercase tracking-widest text-accent">Roadmap</p>
          <h2 className="mt-3 text-h2 text-balance">Eight milestones to 1.0.</h2>
          <p className="mt-5 max-w-xl text-ink-muted">
            Public process. Every milestone ships ADRs, RFCs, tests, docs. No surprises.
          </p>
        </div>
        <ol className="rounded-3xl border border-line bg-white overflow-hidden">
          {MILESTONES.map((m, i) => (
            <li
              key={m.id}
              className={`flex items-center gap-5 px-6 md:px-8 py-5 ${i !== 0 ? "border-t border-line" : ""}`}
            >
              <span
                className={`flex h-8 min-w-[2.5rem] items-center justify-center rounded-full font-mono text-[12px] ${
                  m.status === "active"
                    ? "bg-accent text-white"
                    : m.status === "next"
                    ? "bg-ink text-white"
                    : "bg-surface-alt text-ink-muted"
                }`}
              >
                {m.id}
              </span>
              <span className="flex-1 text-[15px]">{m.title}</span>
              <span
                className={`text-[11px] uppercase tracking-widest ${
                  m.status === "active" ? "text-accent" : "text-ink-subtle"
                }`}
              >
                {m.status === "active" ? "In progress" : m.status === "next" ? "Up next" : "Planned"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
