import Link from "next/link";
import { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
  secondary?: { label: string; href: string };
}

export function EmptyState({ icon, title, description, action, secondary }: Props) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      {icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/60 text-violet-400 ring-1 ring-slate-700/50">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{description}</p>
      {action && (
        <Link href={action.href} className="btn-primary mt-8 px-8">
          {action.label}
        </Link>
      )}
      {secondary && (
        <Link href={secondary.href} className="mt-4 text-sm text-violet-400 hover:underline">
          {secondary.label}
        </Link>
      )}
    </div>
  );
}
