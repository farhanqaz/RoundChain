"use client";

import { FREIGHTER_INSTALL_URL, useWallet } from "@/providers/WalletProvider";

interface Props {
  title?: string;
  description?: string;
}

export function ConnectWallet({
  title = "Connect wallet",
  description = "Circle transactions require Freighter. You approve every action.",
}: Props) {
  const { address, loading, connecting, error, freighterInstalled, connect } = useWallet();

  if (loading) {
    return (
      <div className="border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted">Checking wallet…</p>
      </div>
    );
  }
  if (address) return null;

  const showInstallHint = freighterInstalled === false;

  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="flex flex-col items-center px-6 py-8">
        <button
          onClick={connect}
          disabled={connecting}
          className="btn-primary w-full max-w-xs"
        >
          {connecting ? "Connecting…" : "Connect Freighter"}
        </button>
        {showInstallHint ? (
          <p className="mt-4 text-center text-xs text-muted">
            Freighter not detected in this browser.{" "}
            <a
              href={FREIGHTER_INSTALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              Install extension
            </a>{" "}
            and refresh.
          </p>
        ) : (
          <p className="mt-4 text-center text-xs text-muted">
            Approve the connection prompt in Freighter
          </p>
        )}
        {error && (
          <p className="mt-3 text-center text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
