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
    return <span className="text-xs text-muted">…</span>;
  }

  if (compact) {
    return (
      <span className="text-xs text-muted" title="On-chain trust score">
        {trust.score} pts
      </span>
    );
  }

  return (
    <span
      className="text-xs text-muted"
      title={`${trust.circles_completed} completed · ${trust.circles_defaulted} defaulted`}
    >
      {trust.score} trust
    </span>
  );
}
