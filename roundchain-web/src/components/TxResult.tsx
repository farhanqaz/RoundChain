"use client";

import { explorerTxUrl } from "@/lib/contract";

interface Props {
  hash: string;
  message?: string;
}

export function TxResult({ hash, message = "Transaction confirmed" }: Props) {
  return (
    <div className="animate-scale-in rounded-md border border-border bg-muted-surface p-4 text-sm">
      <div className="flex items-start gap-3">
        <span
          className="animate-success-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
          aria-hidden
        >
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{message}</p>
          <a
            href={explorerTxUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-mono text-xs text-muted underline underline-offset-2 transition hover:text-foreground"
          >
            View on Stellar.Expert →
          </a>
        </div>
      </div>
    </div>
  );
}
