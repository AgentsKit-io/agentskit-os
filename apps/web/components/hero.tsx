import Link from "next/link";
import { ArrowRight, Copy } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-36">
      <div className="container-x text-center relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-3 py-1 text-[12px] text-ink-muted backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-flow-pulse shadow-[0_0_10px_#22d3ee]" />
          Pre-alpha · Milestone M1 · 223+ tests
        </div>
        <h1 className="mt-7 text-display text-balance text-ink">
          The operating system <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-ink via-ink to-accent bg-clip-text text-transparent">
            for AI agents.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-ink-muted md:text-xl">
          Orchestrate, run, and govern multi-agent flows with contracts that don&apos;t drift.
          Self-host day one. Air-gap supported. Built on AgentsKit.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="#waitlist"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-base font-medium text-surface hover:bg-accent-hover active:scale-[0.98] transition shadow-[0_0_40px_-10px_rgba(34,211,238,0.6)]"
          >
            Join the waitlist <ArrowRight className="h-4 w-4" />
          </Link>
          <InstallPill />
        </div>
        <p className="mt-6 text-[13px] text-ink-subtle">
          Desktop app coming soon · CLI alpha shipping in M1
        </p>
      </div>
      <Backdrop />
    </section>
  );
}

function InstallPill() {
  return (
    <button className="group inline-flex h-12 items-center gap-3 rounded-full border border-line bg-panel px-5 font-mono text-[14px] text-ink hover:bg-panel-alt transition">
      <span className="text-accent">$</span>
      <span>pnpm add -D @agentskit/os-cli</span>
      <Copy className="h-3.5 w-3.5 text-ink-subtle group-hover:text-ink transition" />
    </button>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.18), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 grid-bg opacity-70"
        style={{
          maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)",
        }}
      />
    </div>
  );
}
