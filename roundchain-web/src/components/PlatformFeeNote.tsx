"use client";

import { useFeeConfig } from "@/hooks/useFeeConfig";
import { formatFeePercent } from "@/lib/circle-logic";

/** Inline platform fee read from on-chain get_fee_config (falls back to 1%). */
export function PlatformFeeNote({
  className,
  prefix = "",
  suffix = "",
}: {
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const feeBps = useFeeConfig();
  return (
    <span className={className}>
      {prefix}
      {formatFeePercent(feeBps)}
      {suffix}
    </span>
  );
}
