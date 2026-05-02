"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Check } from "lucide-react";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="waitlist" className="relative overflow-hidden py-24 md:py-32 bg-ink text-white">
      <div className="container-x text-center relative z-10">
        <p className="text-eyebrow uppercase tracking-widest text-accent">Coming soon</p>
        <h2 className="mt-3 text-h2 text-balance">Desktop app. Marketplace. Cloud sync.</h2>
        <p className="mx-auto mt-5 max-w-xl text-white/60">
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
            className="flex-1 h-12 rounded-full bg-white/10 border border-white/20 px-5 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/40 outline-none transition"
          />
          <Button variant="accent" size="lg" type="submit">
            {submitted ? <><Check className="h-4 w-4" /> On the list</> : "Request access"}
          </Button>
        </form>
        <p className="mt-4 text-[12px] text-white/40">No spam. Updates roughly every milestone.</p>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 100%, rgba(0,113,227,0.5), transparent 60%)",
        }}
      />
    </section>
  );
}
