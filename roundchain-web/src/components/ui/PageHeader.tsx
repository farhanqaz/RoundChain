import Link from "next/link";
import { ReactNode } from "react";

interface Props {
  backHref?: string;
  backLabel?: string;
  label?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({
  backHref,
  backLabel = "Kembali",
  label,
  title,
  description,
  badge,
  action,
}: Props) {
  return (
    <header className="space-y-4 border-b border-slate-800/60 pb-6">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-white"
        >
          ← {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {label && <p className="section-label">{label}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
