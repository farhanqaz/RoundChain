"use client";

import { useCallback, useEffect, useState } from "react";
import { TxResult } from "@/components/TxResult";
import { SetupUsdcTrustline } from "@/components/SetupUsdcTrustline";
import { Alert } from "@/components/ui/Alert";
import {
  allActivePaid,
  calculateRoundPot,
  canRecipientClaimPayout,
  isPeriodEnded,
  scheduledRecipient,
  timeRemaining,
} from "@/lib/circle-logic";
import {
  buildClaimCollateralOp,
  buildContributeOp,
  buildJoinCircleOp,
  buildTriggerPayoutOp,
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
    onSuccess,
  } = props;

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [usdcInfo, setUsdcInfo] = useState<Awaited<ReturnType<typeof getUsdcBalanceInfo>> | null>(null);

  const issuer = resolveUsdcIssuer(tokenId);
  const isFull = memberCount >= maxMembers;
  const recipient = scheduledRecipient(payoutOrder, currentRound);
  const isMyTurn = recipient === address;
  const periodEnded = isPeriodEnded(nextPayoutTime);
  const everyonePaid = allActivePaid(members);
  const roundPot = calculateRoundPot(members, contributionAmount);

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
  const needsFunds = !needsTrustline && usdcBalance !== null && usdcBalance < contributionAmount;
  const trustRequired =
    minTrustScore != null && minTrustScore > 0 ? minTrustScore : null;
  const trustBlocked =
    trustRequired != null &&
    userTrustScore != null &&
    userTrustScore < trustRequired;
  const canJoin =
    status === "Pending" &&
    !isMember &&
    !isFull &&
    !needsTrustline &&
    !needsFunds &&
    !trustBlocked;
  const canContribute = status === "Active" && isMember && !isSlashed && !hasContributed && !needsTrustline && !needsFunds;
  const canClaimCollateral = isCompleted && isMember && !isSlashed && !collateralClaimed;
  const canClaimPayout = canRecipientClaimPayout(address, members, payoutOrder, currentRound, nextPayoutTime, status);

  const primaryAction =
    canClaimPayout ? "claim" :
    canContribute ? "pay" :
    canJoin ? "join" :
    canClaimCollateral ? "collateral" :
    null;

  return (
    <div className="action-panel">
      <div className="action-panel-header flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">Your actions</p>
          <p className="text-xs text-muted">Approve each transaction in Freighter</p>
        </div>
        {usdcBalance !== null && !needsTrustline && (
          <span className="text-xs text-muted">{formatUsdc(usdcBalance)} USDC</span>
        )}
      </div>

      <div className="action-panel-body">
        {isSlashed && (
          <Alert variant="error">Your collateral was slashed for missing a contribution.</Alert>
        )}

        {needsTrustline && (
          <SetupUsdcTrustline address={address} issuer={issuer} onSuccess={refreshBalance} />
        )}

        {needsFunds && (
          <FundWalletPanel
            address={address}
            minLabel={`Need ${formatUsdc(contributionAmount)} USDC`}
          />
        )}

        {status === "Pending" && !isMember && isFull && (
          <Alert variant="info">This circle is full.</Alert>
        )}

        {status === "Pending" && !isMember && trustRequired != null && (
          <Alert
            variant={trustBlocked ? "warning" : "info"}
            title={`Min. trust score: ${trustRequired}`}
          >
            {userTrustScore != null ? (
              <>
                Your score: <strong>{userTrustScore}</strong> pts
                {trustBlocked
                  ? " — complete circles to build reputation (+10 per clean completion)."
                  : " — you meet the requirement."}
              </>
            ) : (
              "Loading trust score…"
            )}
          </Alert>
        )}

        {primaryAction === "join" && (
          <button
            disabled={!!loading || !canJoin}
            onClick={() => run("Join", () => buildJoinCircleOp(circleId, address))}
            className="btn-primary w-full py-3"
          >
            {loading === "Join"
              ? "Processing…"
              : `Join · ${formatUsdc(contributionAmount)} USDC collateral`}
          </button>
        )}

        {primaryAction === "pay" && (
          <button
            disabled={!!loading || !canContribute}
            onClick={() => run("Contribute", () => buildContributeOp(circleId, address))}
            className="btn-primary w-full py-3"
          >
            {loading === "Pay"
              ? "Processing…"
              : `Pay ${formatUsdc(contributionAmount)} USDC`}
          </button>
        )}

        {primaryAction === "claim" && (
          <div className="space-y-4 border border-border p-4">
            <div>
              <p className="font-medium text-foreground">Your payout turn</p>
              <p className="mt-1 text-sm text-muted">
                {periodEnded ? "Ready to claim to your wallet" : timeRemaining(nextPayoutTime)}
              </p>
            </div>
            {!everyonePaid && periodEnded && (
              <p className="text-sm text-muted">Waiting for all members to contribute.</p>
            )}
            <button
              disabled={!!loading}
              onClick={() => run("Payout", () => buildTriggerPayoutOp(circleId))}
              className="btn-primary w-full py-3"
            >
              {loading === "Payout"
                ? "Processing…"
                : `Claim ${formatUsdc(roundPot)} USDC`}
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

        {status === "Active" && isMember && hasContributed && !isMyTurn && recipient && (
          <p className="text-sm text-muted">
            Round paid. Next payout:{" "}
            <span className="font-mono text-foreground">{shortenAddress(recipient, 6)}</span>
            {!periodEnded && ` · ${timeRemaining(nextPayoutTime)}`}
          </p>
        )}

        {status === "Pending" && isMember && (
          <p className="text-sm text-muted">
            Joined — waiting for {maxMembers - memberCount} more member{maxMembers - memberCount !== 1 ? "s" : ""}.
          </p>
        )}

        {!primaryAction && status === "Active" && isMember && hasContributed && isMyTurn && !canClaimPayout && (
          <p className="text-sm text-muted">Round paid · waiting for payout window</p>
        )}

        {error && <Alert variant="error">{error}</Alert>}
        {txHash && <TxResult hash={txHash} />}
      </div>
    </div>
  );
}
