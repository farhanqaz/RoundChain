"use client";

import { explorerTxUrl } from "@/lib/contract";

interface Props {
  hash: string;
  message?: string;
}

export function TxResult({ hash, message = "Transaksi berhasil dikonfirmasi" }: Props) {
  return (
    <div className="rounded-xl border border-emerald-700/30 bg-emerald-950/25 p-4 text-sm">
      <p className="font-medium text-emerald-300">{message}</p>
      <a
        href={explorerTxUrl(hash)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-violet-400 hover:text-violet-300"
      >
        Lihat di Stellar.Expert →
      </a>
    </div>
  );
}
