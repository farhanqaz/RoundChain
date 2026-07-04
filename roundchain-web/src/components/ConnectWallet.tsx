"use client";

import { useWallet } from "@/providers/WalletProvider";

interface Props {
  title?: string;
  description?: string;
}

export function ConnectWallet({
  title = "Connect wallet",
  description = "Circle transactions require Freighter. You approve every action.",
}: Props) {
  const { address, loading, connect } = useWallet();

  if (loading) {
    return (
      <div className="border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted">Checking wallet…</p>
      </div>
    );
  }
  if (address) return null;

  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="flex flex-col items-center px-6 py-8">
        <button onClick={connect} className="btn-primary w-full max-w-xs">
          Connect Freighter
        </button>
        <p className="mt-4 text-center text-xs text-muted">
          Install the Freighter browser extension
        </p>
      </div>
    </div>
  );
}
