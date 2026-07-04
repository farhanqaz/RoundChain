"use client";

import { explorerTxUrl } from "@/lib/contract";

interface Props {
  hash: string;
  message?: string;
}

export function TxResult({ hash, message = "Transaction confirmed" }: Props) {
  return (
    <div className="rounded-md border border-border bg-muted-surface p-4 text-sm">
      <p className="font-medium text-foreground">{message}</p>
      <a
        href={explorerTxUrl(hash)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block font-mono text-xs text-muted underline underline-offset-2 hover:text-foreground"
      >
        View on Stellar.Expert →
      </a>
    </div>
  );
}
