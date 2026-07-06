"use client";

interface Props {
  value: number;
  className?: string;
  /** Thicker bar with shimmer when true */
  highlight?: boolean;
}

export function AnimatedProgress({ value, className = "", highlight = false }: Props) {
  const pct = Math.min(100, Math.max(highlight ? 4 : 2, value));

  return (
    <div
      className={`overflow-hidden bg-border ${highlight ? "h-1 rounded-full" : "h-px"} ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full bg-foreground transition-[width] duration-700 ease-out ${
          highlight ? "progress-bar-glow rounded-full" : ""
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
