"use client";

interface Props {
  filled: number;
  total: number;
}

/** Visual seat fill for pending circles */
export function MemberSeatGrid({ filled, total }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < filled;
        return (
          <div
            key={i}
            className={`seat-cell flex h-9 w-9 items-center justify-center rounded-md border text-[10px] font-medium transition-all duration-300 ${
              isFilled
                ? "seat-filled border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted"
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
            title={isFilled ? `Member ${i + 1} joined` : `Seat ${i + 1} open`}
          >
            {isFilled ? "✓" : i + 1}
          </div>
        );
      })}
    </div>
  );
}
