"use client";

import Link from "next/link";
import { useState } from "react";
import { IconClose, IconMenu } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { useWallet } from "@/providers/WalletProvider";
import { shortenAddress } from "@/lib/contract";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";

export function Header() {
  const { address, loading, error, connect, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#070a12]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Logo />

        <nav className="hidden items-center gap-0.5 md:flex">
          <Link href="/circles" className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white">
            Arisan
          </Link>
          <Link href="/create" className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white">
            Buat baru
          </Link>
          <Link href="/about" className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white">
            Tentang
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {loading ? (
            <div className="h-9 w-28 animate-pulse rounded-xl bg-slate-800/60" />
          ) : address ? (
            <>
              <TrustScoreBadge address={address} />
              <span className="hidden rounded-lg bg-slate-900/80 px-2.5 py-1.5 font-mono text-xs text-slate-400 ring-1 ring-slate-800 lg:inline">
                {shortenAddress(address)}
              </span>
              <button onClick={disconnect} className="btn-ghost py-2 text-xs">
                Keluar
              </button>
            </>
          ) : (
            <button onClick={connect} className="btn-primary px-4 py-2 text-sm">
              Hubungkan
            </button>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800/60 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      {error && <p className="mx-auto max-w-5xl px-4 pb-2 text-xs text-red-400">{error}</p>}

      {menuOpen && (
        <div className="border-t border-slate-800/80 px-4 py-4 md:hidden">
          <div className="space-y-1">
            {!address && (
              <button onClick={connect} className="btn-primary mb-3 w-full text-sm">
                Hubungkan dompet
              </button>
            )}
            <Link href="/create" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-slate-800/60">
              Buat arisan
            </Link>
            <Link href="/circles" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-slate-800/60">
              Daftar arisan
            </Link>
            <Link href="/demo" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-800/60">
              Sandbox latihan
            </Link>
            {address && (
              <button onClick={disconnect} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-red-400">
                Keluar · {shortenAddress(address)}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
