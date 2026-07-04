"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { FundWalletPanel } from "@/components/FundWalletPanel";
import { SetupUsdcTrustline } from "@/components/SetupUsdcTrustline";
import { ShareCircle } from "@/components/ShareCircle";
import { TxResult } from "@/components/TxResult";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { useWallet } from "@/providers/WalletProvider";
import { DEFAULT_CONTRIBUTION, DEFAULT_PERIOD, USDC_TOKEN } from "@/lib/constants";
import {
  buildCreateCircleOp,
  formatUsdc,
  getNextCircleId,
  getUsdcBalanceInfo,
  signWithFreighter,
  simulateAndSend,
} from "@/lib/contract";
import { checkWalletSetup, dripXlmOnly } from "@/lib/setup";
import { CopyButton } from "@/components/CopyButton";

export default function CreateCirclePage() {
  const router = useRouter();
  const { address } = useWallet();
  const [contribution, setContribution] = useState(String(DEFAULT_CONTRIBUTION / 10_000_000));
  const [periodDays, setPeriodDays] = useState(String(DEFAULT_PERIOD / 86400));
  const [maxMembers, setMaxMembers] = useState("5");
  const [minTrustScore, setMinTrustScore] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [trustline, setTrustline] = useState(false);
  const [usdcOk, setUsdcOk] = useState(false);

  const contributionAmount = BigInt(Math.floor(parseFloat(contribution || "0") * 10_000_000));
  const potEstimate = (parseFloat(contribution || "0") * parseInt(maxMembers || "0", 10)).toFixed(2);

  const refreshWallet = useCallback(async () => {
    if (!address) return;
    const status = await checkWalletSetup(
      address,
      contributionAmount > BigInt(0) ? contributionAmount : BigInt(1_000_000)
    );
    setTrustline(status.hasTrustline);
    setUsdcOk(status.ready);
  }, [address, contributionAmount]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    if (address) dripXlmOnly(address);
  }, [address]);

  const handleCreate = async () => {
    if (!address) return;
    const periodDuration = BigInt(parseInt(periodDays, 10) * 86400);
    const members = parseInt(maxMembers, 10);

    if (contributionAmount <= BigInt(0)) return setError("Contribution must be greater than 0");
    if (members < 2) return setError("At least 2 members required");
    if (periodDuration < BigInt(86400)) return setError("Period must be at least 1 day");

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const balance = await getUsdcBalanceInfo(address, USDC_TOKEN);
      if (balance.needsTrustline) return setError("Enable USDC trustline first");
      if (balance.balance < contributionAmount) {
        return setError(`Insufficient balance — need at least ${formatUsdc(contributionAmount)} USDC`);
      }

      const op = buildCreateCircleOp({
        admin: address,
        token: USDC_TOKEN,
        contributionAmount,
        periodDuration,
        maxMembers: members,
        minTrustScore: minTrustScore.trim()
          ? parseInt(minTrustScore, 10)
          : null,
      });

      const { hash, returnValue } = await simulateAndSend(address, signWithFreighter, op);
      setTxHash(hash);
      let id = returnValue != null ? Number(returnValue) : NaN;
      if (isNaN(id)) id = (await getNextCircleId()) - 1;
      setCreatedId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create circle");
    } finally {
      setLoading(false);
    }
  };

  if (createdId != null) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          label="Success"
          title={`Circle #${createdId}`}
          description="Your circle is live. Join as a member, then invite others."
        />
        <ShareCircle circleId={createdId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={`/join/${createdId}`} className="btn-primary text-center">
            Join as member
          </Link>
          <button
            type="button"
            onClick={() => router.push(`/circle/${createdId}/admin`)}
            className="btn-secondary"
          >
            Admin panel
          </button>
        </div>
        {txHash && <TxResult hash={txHash} />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        backHref="/circles"
        backLabel="Browse circles"
        label="Admin"
        title="Create a circle"
        description="Set member count, contribution amount, and round period."
      />

      {!address && (
        <ConnectWallet
          title="Wallet required"
          description="Connect Freighter to create a circle."
        />
      )}

      {address && (
        <>
          {!trustline && (
            <div className="action-panel">
              <div className="action-panel-header">
                <p className="font-medium text-foreground">USDC trustline</p>
                <p className="text-sm text-muted">One-time setup — approve in Freighter.</p>
              </div>
              <div className="action-panel-body">
                <SetupUsdcTrustline address={address} onSuccess={refreshWallet} />
              </div>
            </div>
          )}

          {trustline && !usdcOk && (
            <div className="action-panel">
              <div className="action-panel-header">
                <p className="font-medium text-foreground">Fund USDC balance</p>
              </div>
              <div className="action-panel-body">
                <FundWalletPanel
                  address={address}
                  minLabel={`Minimum ${formatUsdc(contributionAmount > BigInt(0) ? contributionAmount : BigInt(1_000_000))} USDC`}
                />
                <div className="flex gap-2 pt-2">
                  <CopyButton text={address} label="Copy address" />
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
            <div className="card space-y-6 p-6">
              <FormField label="Members" hint="Including you as admin">
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  className="input"
                />
              </FormField>

              <FormField label="Contribution per round (USDC)">
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                  className="input"
                />
              </FormField>

              <FormField label="Round period (days)" hint="Time between contribution deadlines">
                <input
                  type="number"
                  min={1}
                  value={periodDays}
                  onChange={(e) => setPeriodDays(e.target.value)}
                  className="input"
                />
              </FormField>

              <FormField
                label="Min. trust score (optional)"
                hint="New members need this on-chain reputation to join. Leave empty for open access. +10 per clean completion."
              >
                <input
                  type="number"
                  min={0}
                  step={10}
                  placeholder="0 — open to all"
                  value={minTrustScore}
                  onChange={(e) => setMinTrustScore(e.target.value)}
                  className="input"
                />
              </FormField>

              <button
                onClick={handleCreate}
                disabled={loading || !trustline}
                className="btn-primary w-full"
              >
                {loading ? "Processing…" : "Create circle"}
              </button>
            </div>

            <aside className="card h-fit p-5">
              <p className="section-label">Summary</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Token</dt>
                  <dd className="text-right font-medium text-foreground">USDC testnet</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Members</dt>
                  <dd className="font-medium text-foreground">{maxMembers}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Pot / round</dt>
                  <dd className="font-medium text-foreground">≈ {potEstimate} USDC</dd>
                </div>
                {minTrustScore.trim() && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Min. trust</dt>
                    <dd className="font-medium text-foreground">{minTrustScore} pts</dd>
                  </div>
                )}
              </dl>
            </aside>
          </div>
        </>
      )}

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
