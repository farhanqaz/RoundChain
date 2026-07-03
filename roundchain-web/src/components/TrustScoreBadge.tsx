"use client";

import { useEffect, useState } from "react";
import { getTrustScore, TrustScore } from "@/lib/contract";
import { trustTier } from "@/lib/trust";

interface Props {
  address: string;
  compact?: boolean;
}

export function TrustScoreBadge({ address, compact }: Props) {
  const [trust, setTrust] = useState<TrustScore | null>(null);

  useEffect(() => {
    getTrustScore(address)
      .then(setTrust)
      .catch(() => setTrust(null));
  }, [address]);

  if (!trust) {
    return (
      <span className="hidden h-7 w-16 animate-pulse rounded-lg bg-slate-800/60 lg:inline-block" />
    );
  }

  const tier = trustTier(trust.score);

  if (compact) {
    return (
      <span className={`hidden lg:inline-flex ${tier.className}`} title="Trust score on-chain">
        {trust.score} pts
      </span>
    );
  }

  return (
    <span
      className={`hidden lg:inline-flex ${tier.className}`}
      title={`${trust.circles_completed} arisan selesai · ${trust.circles_defaulted} default`}
    >
      {trust.score} trust
    </span>
  );
}
