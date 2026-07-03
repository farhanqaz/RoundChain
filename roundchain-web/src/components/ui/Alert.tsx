type Variant = "info" | "success" | "warning" | "error";

const variants: Record<Variant, string> = {
  info: "border-slate-700/60 bg-slate-900/50 text-slate-300",
  success: "border-emerald-700/40 bg-emerald-950/30 text-emerald-200",
  warning: "border-amber-700/40 bg-amber-950/30 text-amber-200",
  error: "border-red-800/50 bg-red-950/30 text-red-200",
};

export function Alert({
  variant = "info",
  title,
  children,
}: {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-4 text-sm ${variants[variant]}`}>
      {title && <p className="mb-1 font-medium text-white">{title}</p>}
      {children}
    </div>
  );
}
