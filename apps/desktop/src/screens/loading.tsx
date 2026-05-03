/**
 * Loading screen — shown until the sidecar confirms health.ping is ok.
 */

export const LoadingScreen = (): React.JSX.Element => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4 bg-surface">
      <div className="relative flex items-center justify-center">
        {/* Outer ring glow */}
        <span className="absolute inline-flex h-12 w-12 rounded-full bg-accent opacity-20 animate-ping" />
        {/* Icon placeholder */}
        <span className="relative inline-flex h-8 w-8 rounded-full bg-accent/30 border border-accent/60" />
      </div>
      <p className="text-sm text-ink-muted font-mono tracking-wide">
        Starting AgentsKitOS…
      </p>
    </div>
  )
}
