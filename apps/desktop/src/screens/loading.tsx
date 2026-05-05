export const LoadingScreen = (): React.JSX.Element => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[var(--ag-surface)]">
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-12 w-12 animate-ping rounded-full bg-[var(--ag-accent)] opacity-20" />
        <span className="relative inline-flex h-8 w-8 rounded-full border border-[color-mix(in_srgb,var(--ag-accent)_60%,transparent)] bg-[color-mix(in_srgb,var(--ag-accent)_30%,transparent)]" />
      </div>
      <p className="font-mono text-sm tracking-wide text-[var(--ag-ink-muted)]">
        Starting AgentsKitOS...
      </p>
    </div>
  )
}
