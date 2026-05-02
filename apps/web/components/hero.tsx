import Link from "next/link";
import { ArrowRight, Copy } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-36">
      <div className="container-x text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/60 px-3 py-1 text-[12px] text-ink-muted backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-flow-pulse" />
          Pre-alpha · Milestone M1 · 223+ tests
        </div>
        <h1 className="mt-7 text-display text-balance">
          The operating system <br className="hidden md:block" />
          for AI agents.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-ink-muted md:text-xl">
          Orchestrate, run, and govern multi-agent flows with contracts that don&apos;t drift.
          Self-host day one. Air-gap supported. Built on AgentsKit.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="#waitlist"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-base font-medium text-white hover:bg-ink/90 active:scale-[0.98] transition"
          >
            Join the waitlist <ArrowRight className="h-4 w-4" />
          </Link>
          <InstallPill />
        </div>
        <p className="mt-6 text-[13px] text-ink-subtle">
          Desktop app coming soon · CLI alpha shipping in M1
        </p>
      </div>
      <BackdropGrid />
    </section>
  );
}

function InstallPill() {
  return (
    <button className="group inline-flex h-12 items-center gap-3 rounded-full border border-line bg-white px-5 font-mono text-[14px] text-ink hover:bg-surface-alt transition">
      <span className="text-ink-subtle">$</span>
      <span>pnpm add -D @agentskit/os-cli</span>
      <Copy className="h-3.5 w-3.5 text-ink-muted group-hover:text-ink transition" />
    </button>
  );
}

function BackdropGrid() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(0,113,227,0.08), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #0000000a 1px, transparent 1px), linear-gradient(to bottom, #0000000a 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)",
        }}
      />
    </div>
  );
}
