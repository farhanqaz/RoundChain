"use client";

import { useWallet } from "@/providers/WalletProvider";

interface Props {
  title?: string;
  description?: string;
}

export function ConnectWallet({
  title = "Hubungkan dompet",
  description = "Transaksi arisan membutuhkan dompet Freighter. Anda mengontrol setiap persetujuan.",
}: Props) {
  const { address, loading, connect } = useWallet();

  if (loading) {
    return (
      <div className="card p-10">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-slate-800" />
        <p className="mt-4 text-center text-sm text-slate-500">Memeriksa koneksi dompet…</p>
      </div>
    );
  }
  if (address) return null;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-800/60 bg-slate-950/40 px-6 py-4">
        <p className="font-medium text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      <div className="flex flex-col items-center px-6 py-8">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 ring-1 ring-violet-500/20">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="6" width="18" height="14" rx="2" />
            <path d="M3 10h18" />
            <circle cx="16" cy="14" r="1" fill="currentColor" />
          </svg>
        </div>
        <button onClick={connect} className="btn-primary w-full max-w-xs">
          Hubungkan Freighter
        </button>
        <p className="mt-4 text-center text-xs text-slate-600">
          Extension Freighter harus terpasang di browser Anda
        </p>
      </div>
    </div>
  );
}
