import { CircleStatus } from "@/lib/contract";

const labels: Record<CircleStatus, string> = {
  Pending: "Open",
  Active: "Active",
  Completed: "Done",
  Cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: CircleStatus | string }) {
  const key = status as CircleStatus;
  const label = labels[key] ?? status;

  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
      {label}
    </span>
  );
}
