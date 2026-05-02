import Link from "next/link";
import { Github } from "lucide-react";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-line/60">
      <nav className="container-x flex h-12 items-center justify-between text-[13px]">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo />
          <span>AgentsKitOS</span>
        </Link>
        <ul className="hidden md:flex items-center gap-7 text-ink-muted">
          <li><Link href="#features" className="hover:text-ink transition">Features</Link></li>
          <li><Link href="#architecture" className="hover:text-ink transition">Architecture</Link></li>
          <li><Link href="#personas" className="hover:text-ink transition">Personas</Link></li>
          <li><Link href="#roadmap" className="hover:text-ink transition">Roadmap</Link></li>
          <li><Link href="/docs" className="hover:text-ink transition">Docs</Link></li>
        </ul>
        <div className="flex items-center gap-4 text-ink-muted">
          <Link href="https://github.com/AgentsKit-io/agentskit-os" className="hover:text-ink transition" aria-label="GitHub">
            <Github className="h-4 w-4" />
          </Link>
          <Link href="#waitlist" className="hidden sm:inline-flex h-7 items-center rounded-full bg-ink px-3 text-[12px] font-medium text-white hover:bg-ink/90 transition">
            Join waitlist
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" fill="#1d1d1f" />
      <circle cx="4" cy="6" r="2" stroke="#1d1d1f" strokeWidth="1.5" />
      <circle cx="4" cy="18" r="2" stroke="#1d1d1f" strokeWidth="1.5" />
      <circle cx="20" cy="6" r="2" stroke="#1d1d1f" strokeWidth="1.5" />
      <circle cx="20" cy="18" r="2" stroke="#1d1d1f" strokeWidth="1.5" />
      <path d="M6 6 L9 11 M6 18 L9 13 M18 6 L15 11 M18 18 L15 13" stroke="#1d1d1f" strokeWidth="1.2" />
    </svg>
  );
}
