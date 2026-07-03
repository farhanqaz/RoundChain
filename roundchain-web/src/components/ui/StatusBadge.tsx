import { CircleStatus } from "@/lib/contract";

const styles: Record<CircleStatus, string> = {
  Pending: "bg-amber-500/10 text-amber-300 ring-amber-500/25",
  Active: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
  Completed: "bg-sky-500/10 text-sky-300 ring-sky-500/25",
};

const labels: Record<CircleStatus, string> = {
  Pending: "Menunggu peserta",
  Active: "Berjalan",
  Completed: "Selesai",
};

const dots: Record<CircleStatus, string> = {
  Pending: "bg-amber-400",
  Active: "bg-emerald-400",
  Completed: "bg-sky-400",
};

export function StatusBadge({ status }: { status: CircleStatus | string }) {
  const key = status as CircleStatus;
  const style = styles[key] ?? "bg-slate-500/10 text-slate-400 ring-slate-500/25";
  const label = labels[key] ?? status;
  const dot = dots[key] ?? "bg-slate-500";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
