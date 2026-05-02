import {
  ShieldCheck,
  Activity,
  Plug,
  Wand2,
  History,
  Network,
  DollarSign,
  Cpu,
} from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Signed audit log",
    body: "Merkle-chained, HSM-ready. Tamper-evident trails for regulated workloads.",
  },
  {
    icon: Activity,
    title: "OpenTelemetry gen_ai",
    body: "Datadog, Honeycomb, Langfuse, New Relic, Grafana, PostHog — out of the box.",
  },
  {
    icon: Plug,
    title: "MCP bridge v2",
    body: "Publish AgentsKit tools as MCP servers. Consume any MCP server. Bidirectional.",
  },
  {
    icon: Wand2,
    title: "Generative OS",
    body: "Natural language → agent, flow, trigger, or tool. Editable, never opaque.",
  },
  {
    icon: History,
    title: "Run modes",
    body: "production · preview · dry-run · replay · simulate · deterministic. Pick the safety floor.",
  },
  {
    icon: Network,
    title: "Multi-agent topologies",
    body: "compare · vote · debate · auction · blackboard. ReAct loops. Speculative execution.",
  },
  {
    icon: DollarSign,
    title: "Pre-flight cost estimate",
    body: "Token + dollar projection before run. Live counter during. Per-tenant guardrails.",
  },
  {
    icon: Cpu,
    title: "Sandbox runtimes",
    body: "Side-effect declarations + tiered isolation. e2b built-in. Bring your own runtime.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-surface-dim py-24 md:py-32">
      <div className="container-x">
        <div className="text-center mb-16">
          <p className="text-eyebrow uppercase tracking-widest text-accent">Capabilities</p>
          <h2 className="mt-3 text-h2 text-balance">Everything serious teams need.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-line/60 rounded-3xl overflow-hidden border border-line">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white p-7 hover:bg-surface-alt/40 transition">
              <f.icon className="h-5 w-5 text-accent mb-4" />
              <h3 className="text-[15px] font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
