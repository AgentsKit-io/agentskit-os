export function Architecture() {
  return (
    <section id="architecture" className="bg-surface py-24 md:py-32">
      <div className="container-x">
        <div className="text-center mb-16">
          <p className="text-eyebrow uppercase tracking-widest text-accent">Architecture</p>
          <h2 className="mt-3 text-h2 text-balance text-ink">Thin layer. Strong contracts.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-ink-muted">
            <code className="font-mono text-[14px] text-ink">@agentskit/os-core</code> stays under
            15 KB gzipped. Everything else is independently installable. Use one piece without the
            desktop.
          </p>
        </div>

        <div className="mx-auto max-w-5xl rounded-3xl border border-line bg-panel p-8 md:p-12 shadow-[0_30px_120px_-40px_rgba(34,211,238,0.2)]">
          <Layer
            title="OS Surfaces"
            items={["os-desktop", "os-cli", "os-flow", "os-triggers"]}
            tone="ink"
          />
          <Connector />
          <Layer
            title="@agentskit/os-core"
            subtitle="Zod contracts · event bus · principal/cap · errors · workspace model"
            items={[]}
            tone="accent"
            wide
          />
          <Connector />
          <Layer
            title="OS Services"
            items={["os-security", "os-marketplace", "os-mcp-bridge", "os-cloud-sync"]}
            tone="muted"
          />
          <div className="my-6 border-t border-dashed border-line" />
          <Layer
            title="AgentsKit (upstream)"
            subtitle="core · runtime · adapters · memory · tools · skills · rag · sandbox · eval"
            items={[]}
            tone="muted"
            wide
          />
        </div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <Stat label="Core gzipped" value="<15 KB" />
          <Stat label="Cold start" value="<800 ms" />
          <Stat label="Installer size" value="<15 MB" />
          <Stat label="Time to first agent" value="<60 s" />
        </div>
      </div>
    </section>
  );
}

function Layer({
  title,
  subtitle,
  items,
  tone,
  wide,
}: {
  title: string;
  subtitle?: string;
  items: string[];
  tone: "ink" | "accent" | "muted";
  wide?: boolean;
}) {
  const cls =
    tone === "accent"
      ? "bg-accent text-surface"
      : tone === "ink"
      ? "bg-surface-alt border border-line text-ink"
      : "bg-panel-alt border border-line text-ink-muted";

  if (wide) {
    return (
      <div className={`rounded-2xl px-6 py-5 text-center ${cls}`}>
        <div className="text-[13px] uppercase tracking-widest opacity-70">{title}</div>
        {subtitle && <div className="mt-1 font-mono text-[13.5px]">{subtitle}</div>}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it} className={`rounded-xl px-4 py-3 text-center font-mono text-[13px] font-medium ${cls}`}>
          {it}
        </div>
      ))}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center my-3">
      <div className="h-6 w-px bg-line" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="text-2xl font-semibold tracking-tight text-ink">{value}</div>
      <div className="mt-1 text-[12px] text-ink-muted">{label}</div>
    </div>
  );
}
