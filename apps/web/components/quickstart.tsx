export function Quickstart() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-eyebrow uppercase tracking-widest text-accent">Quick start</p>
          <h2 className="mt-3 text-h2 text-balance">Six commands to your first agent.</h2>
          <p className="mt-5 text-ink-muted">
            Pre-flight cost estimates. Workspace lockfile. Docker deploy. All from the CLI.
          </p>
          <ul className="mt-8 space-y-3 text-[15px] text-ink-muted">
            {[
              ["init", "Scaffold workspace + sane defaults"],
              ["doctor", "Diagnose env, providers, sandbox"],
              ["run", "Execute flow with run-mode + estimate"],
              ["lock", "Pin versions for reproducibility"],
              ["deploy", "Ship to docker / cloud target"],
            ].map(([cmd, desc]) => (
              <li key={cmd} className="flex gap-4">
                <code className="font-mono text-[13px] text-ink bg-surface-alt rounded-md px-2 py-0.5 self-start">{cmd}</code>
                <span>{desc}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-[#0b0b0d] overflow-hidden shadow-[0_40px_100px_-40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[12px] text-white/40 font-mono">~/projects/my-flow</span>
          </div>
          <pre className="px-6 py-6 text-[13px] leading-relaxed font-mono text-white/90 overflow-x-auto">
            <Line c="#86868b"># install once core+cli ship</Line>
            <Line>pnpm add -D @agentskit/os-cli</Line>
            <Line />
            <Line c="#86868b"># scaffold</Line>
            <Line>pnpm agentskit-os init</Line>
            <Line />
            <Line c="#86868b"># diagnose</Line>
            <Line>pnpm agentskit-os doctor</Line>
            <Line />
            <Line c="#86868b"># run with cost estimate first</Line>
            <Line>pnpm agentskit-os run pr-review <Span c="#5ac8fa">--mode</Span> preview <Span c="#5ac8fa">--estimate</Span></Line>
            <Line />
            <Line c="#86868b"># lock + ship</Line>
            <Line>pnpm agentskit-os lock</Line>
            <Line>pnpm agentskit-os deploy <Span c="#5ac8fa">--target</Span> docker</Line>
          </pre>
        </div>
      </div>
    </section>
  );
}

function Line({ children, c }: { children?: React.ReactNode; c?: string }) {
  return (
    <div style={{ color: c }}>
      {children ?? " "}
    </div>
  );
}
function Span({ children, c }: { children: React.ReactNode; c: string }) {
  return <span style={{ color: c }}>{children}</span>;
}
