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
      setError(e instanceof Error ? e.message : "Transaksi gagal");
    } finally {
      setLoading(null);
    }
  };

  const usdcBalance = usdcInfo?.balance ?? null;
  const needsTrustline = usdcInfo?.needsTrustline ?? false;
  const needsFunds = !needsTrustline && usdcBalance !== null && usdcBalance < contributionAmount;
  const canJoin = status === "Pending" && !isMember && !isFull && !needsTrustline && !needsFunds;
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
          <p className="font-medium text-white">Tindakan Anda</p>
          <p className="text-xs text-slate-500">Konfirmasi setiap transaksi di Freighter</p>
        </div>
        {usdcBalance !== null && !needsTrustline && (
          <span className="pill-violet">{formatUsdc(usdcBalance)} USDC</span>
        )}
      </div>

      <div className="action-panel-body">
        {isSlashed && (
          <Alert variant="error">Collateral dipotong karena keterlambatan iuran.</Alert>
        )}

        {needsTrustline && (
          <SetupUsdcTrustline address={address} issuer={issuer} onSuccess={refreshBalance} />
        )}

        {needsFunds && (
          <FundWalletPanel
            address={address}
            minLabel={`Butuh ${formatUsdc(contributionAmount)} USDC`}
          />
        )}

        {status === "Pending" && !isMember && isFull && (
          <Alert variant="info">Kuota peserta sudah terpenuhi.</Alert>
        )}

        {primaryAction === "join" && (
          <button
            disabled={!!loading || !canJoin}
            onClick={() => run("Join", () => buildJoinCircleOp(circleId, address))}
            className="btn-primary w-full py-3.5"
          >
            {loading === "Join"
              ? "Memproses…"
              : `Gabung · jaminan ${formatUsdc(contributionAmount)} USDC`}
          </button>
        )}

        {primaryAction === "pay" && (
          <button
            disabled={!!loading || !canContribute}
            onClick={() => run("Contribute", () => buildContributeOp(circleId, address))}
            className="btn-success w-full py-3.5"
          >
            {loading === "Contribute"
              ? "Memproses…"
              : `Bayar iuran ${formatUsdc(contributionAmount)} USDC`}
          </button>
        )}

        {primaryAction === "claim" && (
          <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/20 p-4">
            <p className="font-medium text-emerald-200">Giliran penerima Anda</p>
            <p className="mt-1 text-sm text-slate-400">
              {periodEnded ? "Siap dicairkan ke dompet Anda" : timeRemaining(nextPayoutTime)}
            </p>
            {!everyonePaid && periodEnded && (
              <p className="mt-2 text-sm text-amber-300">Menunggu iuran semua peserta.</p>
            )}
            <button
              disabled={!!loading}
              onClick={() => run("Payout", () => buildTriggerPayoutOp(circleId))}
              className="btn-success mt-4 w-full py-3.5"
            >
              {loading === "Payout"
                ? "Memproses…"
                : `Terima ${formatUsdc(roundPot)} USDC`}
            </button>
          </div>
        )}

        {primaryAction === "collateral" && (
          <button
            disabled={!!loading}
            onClick={() => run("Claim", () => buildClaimCollateralOp(circleId, address))}
            className="btn-primary w-full py-3.5"
          >
            {loading === "Claim" ? "Memproses…" : "Ambil jaminan kembali"}
          </button>
        )}

        {status === "Active" && isMember && hasContributed && !isMyTurn && recipient && (
          <div className="rounded-xl bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
            Iuran ronde lunas. Giliran:{" "}
            <span className="font-mono text-slate-300">{shortenAddress(recipient, 6)}</span>
            {!periodEnded && ` · ${timeRemaining(nextPayoutTime)}`}
          </div>
        )}

        {status === "Pending" && isMember && (
          <p className="text-sm text-slate-400">
            Terdaftar — menunggu {maxMembers - memberCount} peserta lagi.
          </p>
        )}

        {!primaryAction && status === "Active" && isMember && hasContributed && isMyTurn && !canClaimPayout && (
          <p className="text-sm text-emerald-400/80">Iuran lunas · menunggu jadwal pencairan</p>
        )}

        {error && <Alert variant="error">{error}</Alert>}
        {txHash && <TxResult hash={txHash} />}
      </div>
    </div>
  );
}
