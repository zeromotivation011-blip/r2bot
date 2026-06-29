export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[#050810]/95 backdrop-blur"
    >
      <div className="relative h-20 w-20" aria-hidden>
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-500" />
        <span className="absolute inset-0 flex items-center justify-center text-3xl">🤖</span>
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-amber-300">
        Loading R2BOT…
      </p>
      <span className="sr-only">Loading</span>
    </div>
  );
}
