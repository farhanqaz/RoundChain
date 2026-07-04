type Variant = "info" | "success" | "warning" | "error";

const variants: Record<Variant, string> = {
  info: "border-border bg-muted-surface text-muted",
  success: "border-border bg-card text-muted",
  warning: "border-foreground bg-card text-foreground",
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
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
    <div className={`rounded-md border p-4 text-sm transition-colors duration-300 ${variants[variant]}`}>
      {title && <p className="mb-1 font-medium text-foreground">{title}</p>}
      {children}
    </div>
  );
}
