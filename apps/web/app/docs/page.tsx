import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export default function DocsPlaceholder() {
  return (
    <>
      <Nav />
      <main className="container-x py-32 text-center">
        <p className="text-eyebrow uppercase tracking-widest text-accent">Docs</p>
        <h1 className="mt-3 text-h2 text-balance text-ink">Coming soon — built with fumadocs.</h1>
        <p className="mx-auto mt-5 max-w-xl text-ink-muted">
          ADRs, RFCs, package APIs and the workspace schema reference will live here. Until then,
          read the source on GitHub.
        </p>
        <Link
          href="https://github.com/AgentsKit-io/agentskit-os"
          className="mt-8 inline-flex h-11 items-center rounded-full bg-accent px-6 text-surface text-[15px] font-medium hover:bg-accent-hover transition"
        >
          Read on GitHub
        </Link>
      </main>
      <Footer />
    </>
  );
}
