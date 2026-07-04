"use client";

import { useEffect, useState } from "react";
import { getTrustScore, TrustScore } from "@/lib/contract";

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
      <span className="hidden h-5 w-12 animate-shimmer rounded lg:inline-block" />
    );
  }

  if (compact) {
    return (
      <span className="hidden text-xs text-muted lg:inline" title="On-chain trust score">
        {trust.score} pts
      </span>
    );
  }

  return (
    <span
      className="hidden text-xs text-muted lg:inline"
      title={`${trust.circles_completed} completed · ${trust.circles_defaulted} defaulted`}
    >
      {trust.score} trust
    </span>
  );
}
