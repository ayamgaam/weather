// Route-level loading UI shown while the server component fetches/regenerates.
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-8 h-9 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-800/60"
          />
        ))}
      </div>
    </main>
  );
}
