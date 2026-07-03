import { ReactNode } from "react";

interface Props {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function FormField({ label, hint, children }: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-200">{label}</label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-slate-600">{hint}</p>}
    </div>
  );
}
