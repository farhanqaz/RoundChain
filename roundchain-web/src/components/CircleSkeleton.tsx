export function CircleSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-3 border-b border-border pb-8">
        <div className="h-3 w-20 rounded bg-border" />
        <div className="h-8 w-48 rounded bg-border" />
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-card" />
        ))}
      </div>
      <div className="h-40 animate-shimmer rounded-md" />
    </div>
  );
}
