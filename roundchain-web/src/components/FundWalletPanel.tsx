"use client";

import { CIRCLE_FAUCET_LINK } from "@/lib/setup";
import { CopyButton } from "@/components/CopyButton";

interface Props {
  address: string;
  minLabel?: string;
}

export function FundWalletPanel({ address, minLabel }: Props) {
  return (
    <div className="space-y-3">
      <code className="block truncate rounded-md border border-border bg-muted-surface px-3 py-2.5 font-mono text-xs text-muted">
        {address}
      </code>
      <div className="flex gap-2">
        <CopyButton text={address} label="Copy address" />
        <a
          href={CIRCLE_FAUCET_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex-1 py-2 text-center text-xs"
        >
          Circle faucet
        </a>
      </div>
      {minLabel && <p className="text-xs text-muted">{minLabel}</p>}
    </div>
  );
}
