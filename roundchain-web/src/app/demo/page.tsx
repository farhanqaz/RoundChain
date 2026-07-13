"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CreateSummary } from "@/components/CreateSummary";
import { SetupUsdcTrustline } from "@/components/SetupUsdcTrustline";
import { ShareCircle } from "@/components/ShareCircle";
import { TxResult } from "@/components/TxResult";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { useWallet } from "@/providers/WalletProvider";
import { useFeeConfig } from "@/hooks/useFeeConfig";
import {
  DEMO_CONTRIBUTION,
  DEMO_JOIN_WINDOW_DAYS,
  DEMO_MAX_MEMBERS,
  DEMO_PERIOD_SECONDS,
  USDC_TOKEN,
} from "@/lib/constants";
import {
  collateralForCircle,
  formatUsdc,
  getUsdcBalanceInfo,
  signWithFreighter,
} from "@/lib/contract";
import { netPotAfterFee } from "@/lib/circle-logic";
import {
  demoCircleParams,
  demoCircleValidation,
  executeCreateCircle,
  validateCreateCircle,
} from "@/lib/create-circle";
import { CIRCLE_FAUCET_LINK, checkWalletSetup, dripXlmOnly } from "@/lib/setup";
import { CopyButton } from "@/components/CopyButton";
import { PageShell } from "@/components/PageShell";

const STEPS = ["Wallet", "USDC", "Balance", "Circle"];

export default function DemoPage() {
  const { address, connect, connecting } = useWallet();
  const [xlmDone, setXlmDone] = useState(false);
  const [trustline, setTrustline] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [circleId, setCircleId] = useState<number | null>(null);

  const feeBps = useFeeConfig();
  const contributionAmount = BigInt(DEMO_CONTRIBUTION);
  const collateralAmount = collateralForCircle(contributionAmount, DEMO_MAX_MEMBERS);
  const grossPot = contributionAmount * BigInt(DEMO_MAX_MEMBERS - 1);
  const netPot = netPotAfterFee(grossPot, feeBps);
  const periodDuration = BigInt(DEMO_PERIOD_SECONDS);
  const hasEnoughCollateral =
    usdcBalance === null || usdcBalance >= collateralAmount;
  const stepIndex = !address ? 0 : !trustline ? 1 : !hasEnoughCollateral ? 2 : circleId ? 4 : 3;

  const refresh = useCallback(async () => {
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
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (address && !xlmDone) dripXlmOnly(address).then(() => setXlmDone(true));
  }, [address, xlmDone]);

  const handleCreate = async () => {
    if (!address) return;

    const validationError = validateCreateCircle(demoCircleValidation(usdcBalance));
    if (validationError) return setError(validationError);

    setCreating(true);
    setError(null);
    setTxHash(null);
    try {
      const { hash, circleId: id } = await executeCreateCircle(
        address,
        signWithFreighter,
        demoCircleParams(address)
      );
      setTxHash(hash);
      setCircleId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create practice circle");
    } finally {
      setCreating(false);
    }
  };

  if (circleId != null) {
    return (
      <PageShell className="mx-auto max-w-xl space-y-6">
        <PageHeader
          backHref="/"
          backLabel="Home"
          label="Sandbox"
          title={`Circle #${circleId}`}
          description="You're enrolled. Invite one more person — the circle starts automatically when full."
        />
        <Alert variant="success" title="Practice circle ready">
          Same on-chain flow as create — preset values for quick testing.
        </Alert>
        <ShareCircle circleId={circleId} />
        <Link href={`/circle/${circleId}`} className="btn-primary block text-center text-sm">
          View circle
        </Link>
        {txHash && <TxResult hash={txHash} />}
      </PageShell>
    );
  }

  return (
    <PageShell className="mx-auto max-w-xl space-y-8">
      <PageHeader
        backHref="/"
        backLabel="Home"
        label="Sandbox"
        title="Practice circle"
        description="Quick preset on the same create flow: 2 members, 60-second rounds, 0.1 USDC. You're enrolled when you create."
        action={
          <Link href="/create" className="btn-ghost text-sm">
            Create circle →
          </Link>
        }
      />

      <div className="flex gap-2">
        {STEPS.map((name, i) => (
          <div key={name} className="flex-1">
            <div
              className={`h-px transition ${i <= stepIndex ? "bg-foreground" : "bg-border"}`}
            />
            <p className={`mt-2 text-center text-[10px] uppercase tracking-wide ${i <= stepIndex ? "text-foreground" : "text-muted"}`}>
              {name}
            </p>
          </div>
        ))}
      </div>

      <div className="action-panel">
        <StepRow done={!!address} active={stepIndex === 0} title="Connect wallet">
          {!address ? (
            <button
              type="button"
              onClick={connect}
              disabled={connecting}
              className="btn-primary w-full"
            >
              {connecting ? "Connecting…" : "Connect Freighter"}
            </button>
          ) : (
            <p className="text-sm text-muted">
              Connected{xlmDone && " · testnet XLM funded"}
            </p>
          )}
        </StepRow>

        <StepRow done={trustline} active={stepIndex === 1} title="Enable USDC">
          {address && !trustline && (
            <SetupUsdcTrustline address={address} onSuccess={refresh} />
          )}
          {trustline && <p className="text-sm text-muted">USDC enabled</p>}
        </StepRow>

        <StepRow done={hasEnoughCollateral} active={stepIndex === 2} title="Fund balance">
          <p className="text-sm text-muted">
            Get testnet USDC from the Circle faucet (Stellar Testnet network).
          </p>
          {address && (
            <div className="mt-3 space-y-2">
              <code className="block truncate rounded-md border border-border bg-muted-surface px-3 py-2.5 font-mono text-xs text-muted">
                {address}
              </code>
              <div className="flex gap-2">
                <CopyButton text={address} label="Copy" />
                <a href={CIRCLE_FAUCET_LINK} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 py-2 text-center text-xs">
                  Open faucet
                </a>
              </div>
              {trustline && usdcBalance !== null && (
                <p className="text-xs text-muted">
                  Balance: {formatUsdc(usdcBalance)} USDC
                  {!hasEnoughCollateral &&
                    ` · need ${formatUsdc(collateralAmount)} collateral`}
                </p>
              )}
            </div>
          )}
        </StepRow>

        <StepRow done={!!circleId} active={stepIndex === 3} title="Create practice circle" last>
          <CreateSummary
            periodDuration={periodDuration}
            collateralAmount={collateralAmount}
            netPot={netPot}
            feeBps={feeBps}
            contributorCount={DEMO_MAX_MEMBERS - 1}
            joinDays={DEMO_JOIN_WINDOW_DAYS}
            usdcBalance={usdcBalance}
            hasEnoughCollateral={hasEnoughCollateral}
          />
          {!hasEnoughCollateral && usdcBalance !== null && (
            <div className="mt-3">
              <Alert variant="warning">
                Need {formatUsdc(collateralAmount)} USDC collateral to create this circle.
              </Alert>
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={creating || stepIndex !== 3 || !hasEnoughCollateral}
            className="btn-primary mt-3 w-full"
          >
            {creating ? "Processing…" : "Create practice circle"}
          </button>
        </StepRow>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
    </PageShell>
  );
}

function StepRow({
  done,
  active,
  title,
  last,
  children,
}: {
  done: boolean;
  active: boolean;
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`px-5 py-5 ${!last ? "border-b border-border" : ""} ${active ? "bg-muted-surface" : ""}`}>
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs ${
            done ? "bg-foreground text-background" : active ? "border border-foreground text-foreground" : "border border-border text-muted"
          }`}
        >
          {done ? "✓" : "·"}
        </span>
        <p className={`text-sm font-medium ${done ? "text-muted" : "text-foreground"}`}>{title}</p>
      </div>
      {!done && <div className="pl-10">{children}</div>}
    </div>
  );
}
