"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SetupUsdcTrustline } from "@/components/SetupUsdcTrustline";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { useWallet } from "@/providers/WalletProvider";
import { DEMO_CONTRIBUTION } from "@/lib/constants";
import {
  buildCreateCircleOp,
  formatUsdc,
  getNextCircleId,
  signWithFreighter,
  simulateAndSend,
} from "@/lib/contract";
import {
  CIRCLE_FAUCET_LINK,
  checkWalletSetup,
  dripXlmOnly,
  joinInviteMessage,
  whatsAppShare,
} from "@/lib/setup";
import { USDC_ISSUER, USDC_SAC } from "@/lib/usdc-assets";
import { CopyButton } from "@/components/CopyButton";

const STEPS = ["Wallet", "USDC", "Balance", "Circle"];

export default function DemoPage() {
  const { address, connect } = useWallet();
  const [xlmDone, setXlmDone] = useState(false);
  const [trustline, setTrustline] = useState(false);
  const [usdcOk, setUsdcOk] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [circleId, setCircleId] = useState<number | null>(null);

  const minUsdc = BigInt(DEMO_CONTRIBUTION);
  const stepIndex = !address ? 0 : !trustline ? 1 : !usdcOk ? 2 : circleId ? 4 : 3;

  const refresh = useCallback(async () => {
    if (!address) return;
    const status = await checkWalletSetup(address, minUsdc);
    setTrustline(status.hasTrustline);
    setUsdcBalance(status.usdcBalance);
    setUsdcOk(status.ready);
  }, [address, minUsdc]);

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
    setCreating(true);
    setError(null);
    try {
      const op = buildCreateCircleOp({
        creator: address,
        token: USDC_SAC,
        contributionAmount: minUsdc,
        periodDuration: BigInt(60),
        maxMembers: 2,
        minTrustScore: null,
        joinDeadline: null,
      });
      const { returnValue } = await simulateAndSend(address, signWithFreighter, op);
      let id = returnValue != null ? Number(returnValue) : NaN;
      if (isNaN(id)) id = (await getNextCircleId()) - 1;
      setCircleId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create practice circle");
    } finally {
      setCreating(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        backHref="/"
        backLabel="Home"
        label="Sandbox"
        title="Practice circle"
        description="Quick preset: 2 members, 60-second rounds, 0.1 USDC. For a real circle, use Create Circle."
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
            <button type="button" onClick={connect} className="btn-primary w-full">
              Connect Freighter
            </button>
          ) : (
            <p className="text-sm text-muted">
              Connected{xlmDone && " · testnet XLM funded"}
            </p>
          )}
        </StepRow>

        <StepRow done={trustline} active={stepIndex === 1} title="Enable USDC">
          {address && !trustline && (
            <SetupUsdcTrustline address={address} issuer={USDC_ISSUER} onSuccess={refresh} />
          )}
          {trustline && <p className="text-sm text-muted">USDC enabled</p>}
        </StepRow>

        <StepRow done={usdcOk} active={stepIndex === 2} title="Fund balance">
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
              {trustline && (
                <p className="text-xs text-muted">
                  Balance: {formatUsdc(usdcBalance)} USDC
                  {!usdcOk && ` · min. ${formatUsdc(minUsdc)}`}
                </p>
              )}
            </div>
          )}
        </StepRow>

        <StepRow done={!!circleId} active={stepIndex === 3} title="Create practice circle" last>
          {!circleId ? (
            <>
              <p className="text-sm text-muted">Preset: 2 members · 60 seconds · 0.1 USDC</p>
              <button
                onClick={handleCreate}
                disabled={creating || stepIndex !== 3}
                className="btn-primary mt-3 w-full"
              >
                {creating ? "Processing…" : "Create practice circle"}
              </button>
            </>
          ) : (
            <SuccessPanel circleId={circleId} origin={origin} />
          )}
        </StepRow>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}

function SuccessPanel({
  circleId,
  origin,
}: {
  circleId: number;
  origin: string;
}) {
  const joinUrl = `${origin}/join/${circleId}`;
  const waLink = whatsAppShare(joinInviteMessage(circleId, origin));

  return (
    <div className="space-y-4">
      <Alert variant="success" title={`Circle #${circleId} is ready`}>
        Join as a member and invite one more person. The circle starts automatically when full.
      </Alert>
      <div className="flex gap-2">
        <CopyButton text={joinUrl} label="Copy invite" />
        <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-success flex-1 py-2 text-center text-xs">
          WhatsApp
        </a>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link href={`/join/${circleId}`} className="btn-primary text-center text-sm">
          Join now
        </Link>
        <Link href={`/circle/${circleId}`} className="btn-secondary text-center text-sm">
          View circle
        </Link>
      </div>
    </div>
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
