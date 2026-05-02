import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface py-14">
      <div className="container-x grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-semibold tracking-tight text-ink">AgentsKitOS</div>
          <p className="mt-3 max-w-sm text-[13.5px] text-ink-muted">
            OS-layer on top of AgentsKit. Visual harness, SDLC, orchestrator, marketplace for agents.
            MIT licensed.
          </p>
        </div>
        <Col title="Project">
          <Item href="/docs">Docs</Item>
          <Item href="https://github.com/AgentsKit-io/agentskit-os">GitHub</Item>
          <Item href="https://github.com/AgentsKit-io/agentskit-os/blob/main/ROADMAP.md">Roadmap</Item>
          <Item href="https://github.com/AgentsKit-io/agentskit-os/tree/main/docs/adr">ADRs</Item>
          <Item href="https://github.com/AgentsKit-io/agentskit-os/tree/main/docs/rfc">RFCs</Item>
        </Col>
        <Col title="Resources">
          <Item href="https://github.com/AgentsKit-io/agentskit-os/blob/main/CONTRIBUTING.md">Contributing</Item>
          <Item href="https://github.com/AgentsKit-io/agentskit-os/blob/main/SECURITY.md">Security</Item>
          <Item href="https://github.com/AgentsKit-io/agentskit-os/blob/main/LICENSE">License</Item>
        </Col>
      </div>
      <div className="container-x mt-12 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[12px] text-ink-subtle">
        <span>© {new Date().getFullYear()} AgentsKit Contributors</span>
        <span>Built on AgentsKit · MIT</span>
      </div>
    </footer>
  );
}

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] uppercase tracking-widest text-ink-subtle mb-4">{title}</div>
      <ul className="space-y-2.5 text-[14px]">{children}</ul>
    </div>
  );
}

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-ink-muted hover:text-ink transition">
        {children}
      </Link>
    </li>
  );
}
