import { Lock, GitBranch, Shield } from "lucide-react";

export function Wedge() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-x">
        <div className="text-center mb-16">
          <p className="text-eyebrow uppercase tracking-widest text-accent">Why it&apos;s different</p>
          <h2 className="mt-3 text-h2 text-balance">Foundation over speed.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-ink-muted">
            Existing agent platforms optimized speed-of-shipping. The result: drift, lock-in,
            abandoned plugins. We optimize the opposite.
          </p>
        </div>
        <div className="grid gap-px bg-line/60 rounded-3xl overflow-hidden border border-line">
          <Pillar
            icon={<Lock className="h-5 w-5" />}
            title="Stable contracts"
            body="Zod at every boundary. SemVer strict. ADR before architecture. RFC before breaking changes. Backward-compat within a major."
          />
          <Pillar
            icon={<GitBranch className="h-5 w-5" />}
            title="Zero lock-in"
            body="30+ LLM adapters. Self-host day one. Air-gap supported. Workspace lockfile guarantees byte-reproducible runs across machines."
          />
          <Pillar
            icon={<Shield className="h-5 w-5" />}
            title="Enterprise-native"
            body="Signed audit log (Merkle chain). Capability-based RBAC. Egress default-deny. SOC 2 / HIPAA / GDPR aligned, not bolted on."
          />
        </div>
      </div>
    </section>
  );
}

function Pillar({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white p-8 md:p-12 first:md:col-span-1">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt text-ink mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
