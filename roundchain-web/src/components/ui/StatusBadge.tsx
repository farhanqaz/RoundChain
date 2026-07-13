import { CircleStatus } from "@/lib/contract";

const labels: Record<CircleStatus, string> = {
  Pending: "Open for members",
  Active: "Active",
  Completed: "Done",
  Cancelled: "Cancelled",
};

const dotClass: Record<CircleStatus, string> = {
  Pending: "bg-muted",
  Active: "bg-foreground status-dot-active",
  Completed: "bg-foreground/60",
  Cancelled: "bg-muted",
};

export function StatusBadge({
  status,
  joinClosed,
}: {
  status: CircleStatus | string;
  /** When Pending and the join deadline has passed */
  joinClosed?: boolean;
}) {
  const key = status as CircleStatus;
  let label = labels[key] ?? status;
  if (key === "Pending" && joinClosed) {
    label = "Join closed";
  }
  const dot = dotClass[key] ?? "bg-muted";

  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}
