"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section
      id="waitlist"
      className="relative overflow-hidden border-y border-line bg-surface-alt py-24 md:py-32"
    >
      <div className="container-x text-center relative z-10">
        <p className="text-eyebrow uppercase tracking-widest text-accent">Coming soon</p>
        <h2 className="mt-3 text-h2 text-balance text-ink">
          Desktop app. Marketplace. Cloud sync.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-ink-muted">
          Get early access. Shape the contracts before 1.0. Enterprise pilots opening Q3 2026.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="mx-auto mt-10 flex w-full max-w-md flex-col sm:flex-row gap-3"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="flex-1 h-12 rounded-full bg-panel border border-line px-5 text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:ring-2 focus:ring-accent/20 outline-none transition"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-base font-medium text-surface hover:bg-accent-hover active:scale-[0.98] transition"
          >
            {submitted ? (
              <>
                <Check className="h-4 w-4" /> On the list
              </>
            ) : (
              "Request access"
            )}
          </button>
        </form>
        <p className="mt-4 text-[12px] text-ink-subtle">
          No spam. Updates roughly every milestone.
        </p>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 100%, rgba(34,211,238,0.18), transparent 60%)",
        }}
      />
    </section>
  );
}
