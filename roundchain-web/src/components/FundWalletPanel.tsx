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
      <code className="block truncate rounded-xl bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-400">
        {address}
      </code>
      <div className="flex gap-2">
        <CopyButton text={address} label="Salin alamat" />
        <a
          href={CIRCLE_FAUCET_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex-1 py-2 text-center text-xs"
        >
          Faucet Circle
        </a>
      </div>
      {minLabel && <p className="text-xs text-slate-600">{minLabel}</p>}
    </div>
  );
}
