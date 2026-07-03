import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-900/40 ring-1 ring-white/10">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2.5" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      </span>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-white">
          Round<span className="text-violet-400">Chain</span>
        </span>
      )}
    </Link>
  );
}
