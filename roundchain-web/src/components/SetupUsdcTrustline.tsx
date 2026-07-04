"use client";

import { useState } from "react";
import { signWithFreighter } from "@/lib/contract";
import { buildChangeTrustXdr } from "@/lib/usdc";
import { CIRCLE_FAUCET_LINK } from "@/lib/setup";

interface Props {
  address: string;
  issuer?: string;
  onSuccess: () => void;
}

export function SetupUsdcTrustline({ address, issuer, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const xdr = await buildChangeTrustXdr(address, issuer);
      const signed = await signWithFreighter(xdr);
      const { Horizon, Networks, TransactionBuilder } = await import("@stellar/stellar-sdk");
      const tx = TransactionBuilder.fromXDR(signed, Networks.TESTNET);
      await new Horizon.Server("https://horizon-testnet.stellar.org").submitTransaction(tx);
      setDone(true);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed — try again in Freighter");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className="text-sm text-muted">
        Done. Fund USDC from the{" "}
        <a href={CIRCLE_FAUCET_LINK} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          Circle faucet
        </a>
        .
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSetup}
        disabled={loading}
        className="btn-secondary w-full"
      >
        {loading ? "Waiting for Freighter…" : "Enable USDC"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
