"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { CreateSummary } from "@/components/CreateSummary";
import { SetupUsdcTrustline } from "@/components/SetupUsdcTrustline";
import { ShareCircle } from "@/components/ShareCircle";
import { PageShell } from "@/components/PageShell";
import { TxResult } from "@/components/TxResult";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { useWallet } from "@/providers/WalletProvider";
import {
  DEFAULT_CONTRIBUTION,
  DEFAULT_JOIN_WINDOW_DAYS,
  DEFAULT_PERIOD,
  USDC_TOKEN,
} from "@/lib/constants";
import { useFeeConfig } from "@/hooks/useFeeConfig";
import {
  collateralForCircle,
  formatUsdc,
  getUsdcBalanceInfo,
  signWithFreighter,
} from "@/lib/contract";
import { netPotAfterFee } from "@/lib/circle-logic";
import {
  executeCreateCircle,
  joinDeadlineFromDays,
  regularCreateValidation,
  validateCreateCircle,
} from "@/lib/create-circle";
import { checkWalletSetup, dripXlmOnly } from "@/lib/setup";

const PERIOD_PRESETS = [
  { days: 7, label: "Weekly" },
  { days: 14, label: "Bi-weekly" },
  { days: 30, label: "Monthly" },
] as const;

export default function CreateCirclePage() {
  const { address } = useWallet();
  const [contribution, setContribution] = useState(String(DEFAULT_CONTRIBUTION / 10_000_000));
  const [periodDays, setPeriodDays] = useState(String(DEFAULT_PERIOD / 86400));
  const [maxMembers, setMaxMembers] = useState("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [trustline, setTrustline] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minTrustScore, setMinTrustScore] = useState("");
  const [joinWindowDays, setJoinWindowDays] = useState(String(DEFAULT_JOIN_WINDOW_DAYS));
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);

  const feeBps = useFeeConfig();
  const contributionAmount = BigInt(Math.floor(parseFloat(contribution || "0") * 10_000_000));
  const memberCount = parseInt(maxMembers || "5", 10);
  const collateralAmount = collateralForCircle(contributionAmount, memberCount);
  const grossPot = contributionAmount * BigInt(Math.max(0, memberCount - 1));
  const netPot = netPotAfterFee(grossPot, feeBps);
  const parsedPeriodDays = parseInt(periodDays, 10);
  const parsedJoinDays = parseInt(joinWindowDays, 10);
  const isPresetPeriod = PERIOD_PRESETS.some((p) => p.days === parsedPeriodDays);
  const periodDuration = BigInt(Math.max(0, parsedPeriodDays) * 86400);
  const hasEnoughCollateral =
    usdcBalance === null || usdcBalance >= collateralAmount;

  const refreshWallet = useCallback(async () => {
    if (!address) return;
    const status = await checkWalletSetup(address, BigInt(1_000_000));
    setTrustline(status.hasTrustline);
    try {
      const info = await getUsdcBalanceInfo(address, USDC_TOKEN);
      setUsdcBalance(info.balance);
    } catch {
      setUsdcBalance(null);
    }
  }, [address]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    if (address) dripXlmOnly(address);
  }, [address]);

  const handleCreate = async () => {
    if (!address) return;
    const members = parseInt(maxMembers, 10);
    const trustParsed = minTrustScore.trim() === "" ? null : parseInt(minTrustScore, 10);

    const validationError = validateCreateCircle(
      regularCreateValidation(
        contributionAmount,
        members,
        periodDuration,
        parsedJoinDays,
        trustParsed,
        usdcBalance
      )
    );
    if (validationError) return setError(validationError);

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const { hash, circleId } = await executeCreateCircle(address, signWithFreighter, {
        creator: address,
        token: USDC_TOKEN,
        contributionAmount,
        periodDuration,
        maxMembers: members,
        minTrustScore: trustParsed,
        joinDeadline: joinDeadlineFromDays(parsedJoinDays),
      });
      setTxHash(hash);
      setCreatedId(circleId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create circle");
    } finally {
      setLoading(false);
    }
  };

  if (createdId != null) {
    return (
      <PageShell className="mx-auto max-w-xl space-y-6">
        <PageHeader
          label="Success"
          title={`Circle #${createdId}`}
          description="You're enrolled as a member. Share the link — the circle starts when full."
        />
        <div className="animate-scale-in">
          <ShareCircle circleId={createdId} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={`/circle/${createdId}`} className="btn-primary text-center">
            View circle
          </Link>
          <Link href="/circles" className="btn-secondary text-center">
            Browse circles
          </Link>
        </div>
        {txHash && <TxResult hash={txHash} />}
      </PageShell>
    );
  }

  return (
    <PageShell className="mx-auto max-w-xl space-y-8">
      <PageHeader
        backHref="/circles"
        backLabel="Browse circles"
        label="Create"
        title="New circle"
        description="Set members, contribution, and round length. You're enrolled automatically when you create."
        action={
          <Link href="/demo" className="btn-ghost text-sm">
            Sandbox →
          </Link>
        }
      />

      {!address && (
        <ConnectWallet
          title="Wallet required"
          description="Connect Freighter on Stellar testnet."
        />
      )}

      {address && (
        <>
          {!trustline && (
            <div className="action-panel">
              <div className="action-panel-header">
                <p className="font-medium text-foreground">Enable USDC (one time)</p>
              </div>
              <div className="action-panel-body">
                <SetupUsdcTrustline address={address} onSuccess={refreshWallet} />
              </div>
            </div>
          )}

          <div className="card stagger-item stagger-2 space-y-6 p-6">
            <FormField label="How many members?" hint="Including you — enrolled on create">
              <input
                type="number"
                min={2}
                max={50}
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                className="input"
              />
            </FormField>

            <FormField label="Each member pays per round (USDC)">
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                className="input"
              />
            </FormField>

            <FormField label="Round length" hint="Pick a preset or enter custom days (min 1)">
              <div className="flex flex-wrap gap-2">
                {PERIOD_PRESETS.map(({ days, label }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setPeriodDays(String(days))}
                    className={
                      parsedPeriodDays === days
                        ? "btn-primary px-4 py-2 text-sm"
                        : "btn-secondary px-4 py-2 text-sm"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
                className="input mt-3"
                placeholder="Custom days"
              />
              {!isPresetPeriod && parsedPeriodDays >= 1 && (
                <p className="mt-1 text-xs text-muted">Custom: every {parsedPeriodDays} days</p>
              )}
            </FormField>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-sm text-muted underline-offset-2 hover:underline"
            >
              {showAdvanced ? "Hide advanced options" : "Advanced options (trust, join window)"}
            </button>

            {showAdvanced && (
              <div className="space-y-4 rounded-md border border-border bg-muted-surface p-4">
                <FormField
                  label="Minimum trust score"
                  hint="Applies to you and all joiners. +10 per clean circle, −25 on default. Leave empty for no requirement."
                >
                  <input
                    type="number"
                    min={0}
                    value={minTrustScore}
                    onChange={(e) => setMinTrustScore(e.target.value)}
                    className="input"
                    placeholder="e.g. 20"
                  />
                </FormField>
                <FormField label="Join window (days)" hint="How long others can join">
                  <input
                    type="number"
                    min={1}
                    value={joinWindowDays}
                    onChange={(e) => setJoinWindowDays(e.target.value)}
                    className="input"
                  />
                </FormField>
              </div>
            )}

            <CreateSummary
              periodDuration={periodDuration}
              collateralAmount={collateralAmount}
              netPot={netPot}
              feeBps={feeBps}
              contributorCount={Math.max(0, memberCount - 1)}
              joinDays={parsedJoinDays}
              usdcBalance={usdcBalance}
              hasEnoughCollateral={hasEnoughCollateral}
            />

            {!hasEnoughCollateral && usdcBalance !== null && (
              <Alert variant="warning">
                Need {formatUsdc(collateralAmount)} USDC collateral to create this circle.
              </Alert>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !trustline || !hasEnoughCollateral}
              className="btn-primary w-full"
            >
              {loading ? "Processing…" : "Create circle"}
            </button>
          </div>
        </>
      )}

      {error && <Alert variant="error">{error}</Alert>}
    </PageShell>
  );
}
