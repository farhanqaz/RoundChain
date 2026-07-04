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
    <div className="flex flex-col items-center border border-border bg-card px-6 py-16 text-center">
      {icon && (
        <div className="mb-5 text-muted">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {action && (
        <Link href={action.href} className="btn-primary mt-8 px-6">
          {action.label}
        </Link>
      )}
      {secondary && (
        <Link href={secondary.href} className="mt-4 text-sm text-muted underline underline-offset-4 hover:text-foreground">
          {secondary.label}
        </Link>
      )}
    </div>
  );
}
