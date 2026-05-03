import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={source.pageTree}
        nav={{
          title: (
            <span className="flex items-center gap-2 font-semibold tracking-tight">
              <Logo />
              AgentsKitOS
            </span>
          ),
        }}
        githubUrl="https://github.com/AgentsKit-io/agentskit-os"
        sidebar={{ defaultOpenLevel: 1 }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}

function Logo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" fill="#22d3ee" />
      <circle cx="4" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6 L9 11 M6 18 L9 13 M18 6 L15 11 M18 18 L15 13" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.2" />
    </svg>
  );
}
