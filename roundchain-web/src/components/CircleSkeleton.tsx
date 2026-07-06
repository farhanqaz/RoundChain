export function CircleSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3 border-b border-border pb-8">
        <div className="h-3 w-20 animate-shimmer rounded" />
        <div className="h-8 w-48 animate-shimmer rounded" />
        <div className="h-4 w-24 animate-shimmer rounded" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-shimmer bg-card" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-32 animate-shimmer rounded" />
        <div className="h-24 animate-shimmer rounded-md" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 animate-shimmer rounded-md" />
        ))}
      </div>
    </div>
  );
}
