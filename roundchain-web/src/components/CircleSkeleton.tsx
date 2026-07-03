export function CircleSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex justify-between">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded-lg bg-slate-800/80" />
          <div className="h-9 w-56 rounded-lg bg-slate-800/80" />
          <div className="h-6 w-28 rounded-full bg-slate-800/60" />
        </div>
        <div className="hidden h-20 w-28 rounded-2xl bg-slate-800/60 sm:block" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-800/50" />
        ))}
      </div>
      <div className="h-56 rounded-2xl bg-slate-800/50" />
      <div className="h-36 rounded-2xl bg-slate-800/50" />
    </div>
  );
}
