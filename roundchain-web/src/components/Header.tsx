"use client";

import Link from "next/link";
import { useState } from "react";
import { IconClose, IconMenu } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { useWallet } from "@/providers/WalletProvider";
import { shortenAddress } from "@/lib/contract";

export function Header() {
  const { address, loading, connecting, error, connect, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b border-border backdrop-blur-sm transition-colors duration-300"
      style={{ background: "var(--header-bg)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
        <Logo />

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/circles" className="nav-link">
            Circles
          </Link>
          <Link href="/create" className="nav-link">
            Create
          </Link>
          <Link href="/demo" className="nav-link">
            Sandbox
          </Link>
          <Link href="/about" className="nav-link">
            About
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {loading ? (
            <div className="h-8 w-24 animate-shimmer rounded-md" />
          ) : address ? (
            <>
              <TrustScoreBadge address={address} />
              <span className="hidden font-mono text-xs text-muted lg:inline">
                {shortenAddress(address)}
              </span>
              <button onClick={disconnect} className="btn-ghost text-xs">
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="btn-primary px-4 py-2 text-sm"
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            className="rounded-md p-2 text-muted hover:text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {error && <p className="mx-auto max-w-5xl px-4 pb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {menuOpen && (
        <div className="border-t border-border px-4 py-4 md:hidden animate-fade-up">
          <div className="space-y-1">
            {!address && (
              <button
                onClick={connect}
                disabled={connecting}
                className="btn-primary mb-3 w-full text-sm"
              >
                {connecting ? "Connecting…" : "Connect wallet"}
              </button>
            )}
            <Link href="/create" onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm text-foreground">
              Create circle
            </Link>
            <Link href="/circles" onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm text-foreground">
              Browse circles
            </Link>
            <Link href="/demo" onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm text-muted">
              Sandbox
            </Link>
            {address && (
              <button onClick={disconnect} className="mt-2 w-full py-2 text-left text-sm text-muted">
                Disconnect · {shortenAddress(address)}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
