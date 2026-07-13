import { formatFeePercent, formatPeriod } from "@/lib/circle-logic";
import { formatUsdcDisplay } from "@/lib/contract";

function SummaryRow({
  label,
  value,
  emphasize = true,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span
        className={`shrink-0 text-right tabular-nums ${emphasize ? "font-medium text-foreground" : "text-muted"}`}
      >
        {value}
      </span>
    </div>
  );
}

export function CreateSummary({
  periodDuration,
  collateralAmount,
  netPot,
  feeBps,
  contributorCount,
  joinDays,
  usdcBalance,
  hasEnoughCollateral,
}: {
  periodDuration: bigint;
  collateralAmount: bigint;
  netPot: bigint;
  feeBps: number;
  contributorCount: number;
  joinDays: number;
  usdcBalance: bigint | null;
  hasEnoughCollateral: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted-surface text-sm">
      <SummaryRow label="Round period" value={formatPeriod(periodDuration)} />
      <div className="border-t border-border">
        <SummaryRow
          label="Collateral on create"
          value={`${formatUsdcDisplay(collateralAmount)} USDC`}
        />
      </div>
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted">Pot each round (net)</span>
          <span className="shrink-0 text-right font-medium tabular-nums text-foreground">
            ≈ {formatUsdcDisplay(netPot)} USDC
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {contributorCount} contributor{contributorCount !== 1 ? "s" : ""} pay per round ·
          recipient exempt · {formatFeePercent(feeBps)} platform fee
        </p>
      </div>
      <div className="border-t border-border">
        <SummaryRow
          label="Join window"
          value={joinDays >= 1 ? `${joinDays} days` : "—"}
          emphasize={false}
        />
      </div>
      {usdcBalance !== null && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between gap-6 px-4 py-3 text-sm">
            <span className="text-muted">Your USDC balance</span>
            <span
              className={`shrink-0 text-right tabular-nums ${
                hasEnoughCollateral ? "font-medium text-foreground" : "text-foreground/60"
              }`}
            >
              {formatUsdcDisplay(usdcBalance)} USDC
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
