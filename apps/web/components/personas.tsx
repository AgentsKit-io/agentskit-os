import { Stethoscope, Code2, Megaphone, Activity } from "lucide-react";

const PERSONAS = [
  {
    icon: Stethoscope,
    name: "Healthcare & clinical",
    body: "Air-gap mode. Safe-Harbor PII redaction. Patient consent + break-glass. Determinism mode for regulated decisions.",
    tone: "from-[#e6f0ff] to-white",
  },
  {
    icon: Code2,
    name: "Coding & dev tooling",
    body: "Repo-aware agents. Multi-runtime sandbox. Diff primitives. Cost-per-PR. Local-model fallback for offline work.",
    tone: "from-[#eef0ff] to-white",
  },
  {
    icon: Megaphone,
    name: "Marketing agencies",
    body: "Multi-client workspace isolation. BrandKit (tone, banned phrases, disclaimers). Approval HITL. Per-client cost reporting.",
    tone: "from-[#fff0ee] to-white",
  },
  {
    icon: Activity,
    name: "Ops & SRE",
    body: "Durable flows. Cron + webhook + CDC triggers. Cost heat map. Anomaly detection on traces. PagerDuty + Slack native.",
    tone: "from-[#eefff5] to-white",
  },
];

export function Personas() {
  return (
    <section id="personas" className="py-24 md:py-32">
      <div className="container-x">
        <div className="text-center mb-16">
          <p className="text-eyebrow uppercase tracking-widest text-accent">Built for</p>
          <h2 className="mt-3 text-h2 text-balance">Four wedges. One platform.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PERSONAS.map((p) => (
            <div
              key={p.name}
              className={`group relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br ${p.tone} p-8 md:p-10 transition-all hover:-translate-y-0.5 hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.18)]`}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-line text-ink">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
