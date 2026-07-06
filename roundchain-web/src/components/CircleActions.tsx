"use client";

import { useCallback, useEffect, useState } from "react";
import { useFeeConfig } from "@/hooks/useFeeConfig";
import { TxResult } from "@/components/TxResult";
import { SetupUsdcTrustline } from "@/components/SetupUsdcTrustline";
import { Alert } from "@/components/ui/Alert";
import {
  activeDefaulters,
  allContributorsPaid,
  calculateRoundPot,
  canTriggerPayout,
  canVoluntaryExit,
  isJoinDeadlinePassed,
  isPeriodEnded,
  memberMustPayThisRound,
  netPotAfterFee,
  remainingSettlementRounds,
  scheduledRecipient,
  timeRemaining,
  formatFeePercent,
} from "@/lib/circle-logic";
import {
  buildCancelCircleOp,
  buildClaimCollateralOp,
  buildContributeOp,
  buildCompleteExitOp,
  buildExitCircleOp,
  buildJoinCircleOp,
  buildLeaveCircleOp,
  buildSlashDefaulterOp,
  buildStartCircleOp,
  buildTriggerPayoutOp,
  collateralForCircle,
  formatUsdc,
  getUsdcBalanceInfo,
  MemberDetail,
  shortenAddress,
  signWithFreighter,
  simulateAndSend,
} from "@/lib/contract";
import { resolveUsdcIssuer } from "@/lib/usdc";
import { FundWalletPanel } from "@/components/FundWalletPanel";

interface Props {
  circleId: number;
  address: string;
  tokenId: string;
  status: string;
  isMember: boolean;
  isSlashed: boolean;
  hasContributed: boolean;
  isCompleted: boolean;
  collateralClaimed: boolean;
  contributionAmount: bigint;
  memberCount: number;
  maxMembers: number;
  members: MemberDetail[];
  currentRound: number;
  payoutOrder: string[];
  nextPayoutTime: bigint;
  minTrustScore?: number | null;
  userTrustScore?: number | null;
  totalRounds?: number;
  joinDeadline?: bigint;
  hasReceivedPayout?: boolean;
  isExitedClean?: boolean;
  onSuccess: () => void;
}

export function CircleActions(props: Props) {
  const {
    circleId,
    address,
    tokenId,
    status,
    isMember,
    isSlashed,
    hasContributed,
    isCompleted,
    collateralClaimed,
    contributionAmount,
    memberCount,
    maxMembers,
    members,
    currentRound,
    payoutOrder,
    nextPayoutTime,
    minTrustScore,
    userTrustScore,
    totalRounds = 0,
    joinDeadline = BigInt(0),
    hasReceivedPayout = false,
    isExitedClean = false,
    onSuccess,
  } = props;

  const feeBps = useFeeConfig();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showRiskExit, setShowRiskExit] = useState(false);
  const [usdcInfo, setUsdcInfo] = useState<Awaited<ReturnType<typeof getUsdcBalanceInfo>> | null>(null);

  const issuer = resolveUsdcIssuer(tokenId);
  const defaulters = activeDefaulters(members, payoutOrder, currentRound);
  const collateralRequired = collateralForCircle(contributionAmount, maxMembers);
  const isFull = memberCount >= maxMembers;
  const recipient = scheduledRecipient(payoutOrder, currentRound);
  const isMyTurn = recipient === address;
  const periodEnded = isPeriodEnded(nextPayoutTime);
  const everyonePaid = allContributorsPaid(members, payoutOrder, currentRound);
  const roundPot = calculateRoundPot(members, contributionAmount, payoutOrder, currentRound);
  const netRoundPot = netPotAfterFee(roundPot, feeBps);
  const joinClosed =
    status === "Pending" && joinDeadline > BigInt(0) && isJoinDeadlinePassed(joinDeadline);
  const settlementRounds = remainingSettlementRounds(totalRounds, currentRound);
  const settlementAmount = contributionAmount * BigInt(settlementRounds);

  const canLeave = status === "Pending" && isMember && !isSlashed && !joinClosed;
  const canExit =
    status === "Active" &&
    isMember &&
    !isSlashed &&
    !isExitedClean &&
    !hasReceivedPayout &&
    canVoluntaryExit(hasContributed, nextPayoutTime);
  const canCompleteExit =
    status === "Active" &&
    isMember &&
    !isSlashed &&
    !isExitedClean &&
    hasReceivedPayout &&
    settlementRounds > 0;
  const canCancel =
    status === "Pending" && memberCount > 0 && joinDeadline > BigInt(0) && joinClosed;
  const canStartRecovery = status === "Pending" && isFull;
  const canSlash = status === "Active" && periodEnded && defaulters.length > 0;
  const canReleasePayout = canTriggerPayout(
    members,
    payoutOrder,
    currentRound,
    nextPayoutTime,
    status
  );

  const refreshBalance = useCallback(() => {
    getUsdcBalanceInfo(address, tokenId).then(setUsdcInfo).catch(() => setUsdcInfo(null));
  }, [address, tokenId]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const run = async (action: string, buildOp: () => ReturnType<typeof buildJoinCircleOp>) => {
    setLoading(action);
    setError(null);
    setTxHash(null);
    try {
      const { hash } = await simulateAndSend(address, signWithFreighter, buildOp());
      setTxHash(hash);
      refreshBalance();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setLoading(null);
    }
  };

  const usdcBalance = usdcInfo?.balance ?? null;
  const needsTrustline = usdcInfo?.needsTrustline ?? false;

  const wantsJoin = status === "Pending" && !isMember && !isFull && !joinClosed;
  const isRecipientThisRound = memberMustPayThisRound(address, payoutOrder, currentRound) === false;
  const wantsPay =
    status === "Active" &&
    isMember &&
    !isSlashed &&
    !isExitedClean &&
    !hasContributed &&
    !isRecipientThisRound;
  const wantsCompleteExit = canCompleteExit;

  const needsPayFunds =
    wantsPay && usdcBalance !== null && usdcBalance < contributionAmount;
  const needsSettlementFunds =
    wantsCompleteExit && usdcBalance !== null && usdcBalance < settlementAmount;
  const needsJoinFunds =
    wantsJoin && usdcBalance !== null && usdcBalance < collateralRequired;

  const needsFunds =
    !needsTrustline && (needsJoinFunds || needsPayFunds || needsSettlementFunds);

  const trustRequired = minTrustScore != null && minTrustScore > 0 ? minTrustScore : null;
  const trustPending = trustRequired != null && userTrustScore == null;
  const trustBlocked =
    trustRequired != null && userTrustScore != null && userTrustScore < trustRequired;

  const canJoin = wantsJoin && !needsTrustline && !needsJoinFunds && !trustBlocked && !trustPending;
  const canContribute = wantsPay && !needsTrustline && !needsPayFunds;
  const canCompleteExitNow = wantsCompleteExit && !needsTrustline && !needsSettlementFunds;
  const canClaimCollateral = isCompleted && isMember && !isSlashed && !isExitedClean && !collateralClaimed;

  const primaryAction = canReleasePayout
    ? "release"
    : canContribute
      ? "pay"
      : canJoin
        ? "join"
        : canClaimCollateral
          ? "collateral"
          : null;

  const fundLabel = needsJoinFunds
    ? `Need ${formatUsdc(collateralRequired)} USDC collateral`
    : needsSettlementFunds && needsPayFunds
      ? `Need ${formatUsdc(contributionAmount)} USDC to pay this round, or ${formatUsdc(settlementAmount)} USDC to settle all`
      : needsSettlementFunds
        ? `Need ${formatUsdc(settlementAmount)} USDC to settle exit`
        : `Need ${formatUsdc(contributionAmount)} USDC`;

  return (
    <div className="action-panel animate-scale-in">
      <div className="action-panel-header flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">Your actions</p>
          <p className="text-xs text-muted">Approve each step in Freighter</p>
        </div>
        {usdcBalance !== null && !needsTrustline && (
          <span className="text-xs text-muted">{formatUsdc(usdcBalance)} USDC</span>
        )}
      </div>

      <div className="action-panel-body">
        {isSlashed && (
          <Alert variant="error">Your collateral was slashed for missing a contribution.</Alert>
        )}

        {isExitedClean && (
          <Alert variant="info">You exited cleanly — remaining rounds were prepaid.</Alert>
        )}

        {joinClosed && status === "Pending" && (
          <Alert variant="warning" title="Join window closed">
            No new members. Anyone can cancel to refund existing members.
          </Alert>
        )}

        {needsTrustline && (
          <SetupUsdcTrustline address={address} issuer={issuer} onSuccess={refreshBalance} />
        )}

        {needsFunds && (
          <FundWalletPanel address={address} minLabel={fundLabel} />
        )}

        {trustPending && wantsJoin && (
          <Alert variant="info">Checking trust score…</Alert>
        )}

        {trustBlocked && wantsJoin && (
          <Alert variant="warning" title={`Trust score ${trustRequired}+ required`}>
            Your score: {userTrustScore ?? 0} — complete circles for +10 each.
          </Alert>
        )}

        {status === "Cancelled" && (
          <Alert variant="warning">Circle cancelled — collateral refunded to members.</Alert>
        )}

        {primaryAction === "join" && (
          <button
            disabled={!!loading || !canJoin}
            onClick={() => run("Join", () => buildJoinCircleOp(circleId, address))}
            className="btn-primary w-full py-3"
          >
            {loading === "Join"
              ? "Processing…"
              : `Join · deposit ${formatUsdc(collateralRequired)} USDC`}
          </button>
        )}

        {primaryAction === "pay" && (
          <button
            disabled={!!loading || !canContribute}
            onClick={() => run("Contribute", () => buildContributeOp(circleId, address))}
            className="btn-primary w-full py-3"
          >
            {loading === "Contribute" ? "Processing…" : `Pay ${formatUsdc(contributionAmount)} USDC`}
          </button>
        )}

        {primaryAction === "release" && (
          <div className="space-y-3 border border-border p-4">
            <div>
              <p className="font-medium text-foreground">
                {isMyTurn ? "Your payout turn" : "Round ready to release"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {isMyTurn
                  ? `All members paid — release the pot to your wallet (${formatFeePercent(feeBps)} platform fee deducted)`
                  : `Waiting on payout to ${recipient ? shortenAddress(recipient, 6) : "recipient"}`}
              </p>
            </div>
            {!everyonePaid && periodEnded && (
              <p className="text-sm text-muted">Waiting for all contributors to pay this round.</p>
            )}
            <button
              disabled={!!loading || !canReleasePayout}
              onClick={() => run("Payout", () => buildTriggerPayoutOp(circleId))}
              className="btn-primary w-full py-3"
            >
              {loading === "Payout"
                ? "Processing…"
                : `Release ${formatUsdc(netRoundPot)} USDC`}
            </button>
          </div>
        )}

        {primaryAction === "collateral" && (
          <button
            disabled={!!loading}
            onClick={() => run("Claim", () => buildClaimCollateralOp(circleId, address))}
            className="btn-primary w-full py-3"
          >
            {loading === "Claim" ? "Processing…" : "Reclaim collateral"}
          </button>
        )}

        {status === "Active" && isMember && isRecipientThisRound && !canReleasePayout && (
          <p className="text-sm text-muted">
            Your payout turn — waiting for others to pay this round.
            {!periodEnded && ` · ${timeRemaining(nextPayoutTime)}`}
          </p>
        )}

        {status === "Active" && isMember && hasContributed && !canReleasePayout && recipient && !isRecipientThisRound && (
          <p className="text-sm text-muted">
            Round paid · next:{" "}
            <span className="font-mono text-foreground">{shortenAddress(recipient, 6)}</span>
            {!periodEnded && ` · ${timeRemaining(nextPayoutTime)}`}
          </p>
        )}

        {status === "Pending" && isMember && !isFull && (
          <p className="text-sm text-muted">
            Waiting for {maxMembers - memberCount} more member
            {maxMembers - memberCount !== 1 ? "s" : ""} — starts automatically when full.
          </p>
        )}

        {canStartRecovery && (
          <button
            disabled={!!loading}
            onClick={() => run("Start", () => buildStartCircleOp(circleId))}
            className="btn-secondary w-full py-3"
          >
            {loading === "Start" ? "Processing…" : "Start circle (recovery)"}
          </button>
        )}

        {canLeave && (
          <button
            disabled={!!loading}
            onClick={() => run("Leave", () => buildLeaveCircleOp(circleId, address))}
            className="btn-secondary w-full py-3"
          >
            {loading === "Leave" ? "Processing…" : "Leave · full refund"}
          </button>
        )}

        {canCompleteExit && (
          <div className="space-y-2 border border-border p-4">
            <p className="text-sm text-muted">
              Done after your payout? Settle {settlementRounds} round
              {settlementRounds !== 1 ? "s" : ""} ({formatUsdc(settlementAmount)} USDC) and get
              your collateral back. Trust +10 applies when the circle completes.
            </p>
            <button
              disabled={!!loading || !canCompleteExitNow}
              onClick={() => run("Complete exit", () => buildCompleteExitOp(circleId, address))}
              className="btn-secondary w-full py-3"
            >
              {loading === "Complete exit" ? "Processing…" : "Settle & exit"}
            </button>
          </div>
        )}

        {canExit && !showRiskExit && (
          <button
            type="button"
            onClick={() => setShowRiskExit(true)}
            className="text-xs text-muted underline underline-offset-2"
          >
            Leave before your payout (forfeits collateral)
          </button>
        )}

        {canExit && showRiskExit && (
          <div className="space-y-2 border border-red-200 p-4 dark:border-red-900">
            <p className="text-sm text-muted">
              Forfeits {formatUsdc(collateralRequired)} USDC collateral and lowers trust score.
            </p>
            <button
              disabled={!!loading}
              onClick={() => run("Exit", () => buildExitCircleOp(circleId, address))}
              className="btn-danger w-full py-2 text-sm"
            >
              {loading === "Exit" ? "Processing…" : "Confirm early exit"}
            </button>
          </div>
        )}

        {canCancel && (
          <button
            disabled={!!loading}
            onClick={() => run("Cancel", () => buildCancelCircleOp(circleId, address))}
            className="btn-danger w-full py-3"
          >
            {loading === "Cancel" ? "Processing…" : "Cancel circle · refund all"}
          </button>
        )}

        {canSlash && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-foreground">Slash non-payers</p>
            {defaulters.map((d) => (
              <button
                key={d.address}
                disabled={!!loading}
                onClick={() => run("Slash", () => buildSlashDefaulterOp(circleId, d.address))}
                className="btn-danger w-full text-sm"
              >
                Slash {shortenAddress(d.address)}
              </button>
            ))}
          </div>
        )}

        {!primaryAction && status === "Active" && isMember && hasContributed && isMyTurn && !canReleasePayout && (
          <p className="text-sm text-muted">Paid · {timeRemaining(nextPayoutTime)}</p>
        )}

        {error && <Alert variant="error">{error}</Alert>}
        {txHash && <TxResult hash={txHash} />}
      </div>
    </div>
  );
}
