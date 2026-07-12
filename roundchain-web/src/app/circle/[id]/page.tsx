"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CircleActions } from "@/components/CircleActions";
import { CircleDashboard } from "@/components/CircleDashboard";
import { CircleSkeleton } from "@/components/CircleSkeleton";
import { ConnectWallet } from "@/components/ConnectWallet";
import { ShareCircle } from "@/components/ShareCircle";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useWallet } from "@/providers/WalletProvider";
import { useCircle } from "@/hooks/useCircle";
import { isJoinDeadlinePassed } from "@/lib/circle-logic";
import { PageShell } from "@/components/PageShell";

export default function CirclePage() {
  const params = useParams();
  const circleId = parseInt(params.id as string, 10);
  const { address } = useWallet();
  const { data, error, loading, refreshing, refreshAfterTx } = useCircle(circleId, address);

  if (loading) return <CircleSkeleton />;

  const circle = data?.circle;

  if (!loading && !error && !circle) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-medium text-foreground">Circle not found</h1>
        <p className="mt-2 text-muted">ID #{circleId} is invalid or does not exist yet.</p>
        <Link href="/circles" className="btn-primary mt-8 px-8">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <PageShell className="space-y-8">
      {error && (
        <Alert variant="error">
          {error}{" "}
          <Link href="/circles" className="underline">Browse circles</Link>
        </Alert>
      )}

      {circle && data && (
        <>
          <PageHeader
            backHref="/circles"
            backLabel="Browse circles"
            title={`Circle #${circleId}`}
            badge={<StatusBadge status={circle.status} />}
            action={undefined}
          />

          {refreshing && (
            <p className="-mt-4 text-xs text-muted">Refreshing…</p>
          )}

          <CircleDashboard circle={circle} members={data.members} circleId={circleId} />
          {circle.status === "Pending" &&
            circle.member_count < circle.max_members &&
            !(circle.join_deadline > BigInt(0) && isJoinDeadlinePassed(circle.join_deadline)) && (
              <ShareCircle circleId={circleId} />
            )}

          {!address && (
            <ConnectWallet
              title="Wallet required"
              description="Connect Freighter to pay, release payouts, or manage your membership."
            />
          )}

          {address && (
            <CircleActions
              circleId={circleId}
              address={address}
              tokenId={circle.token}
              status={circle.status}
              isMember={data.isMember}
              isSlashed={data.isSlashed}
              hasContributed={data.hasContributed}
              isCompleted={circle.status === "Completed"}
              collateralClaimed={data.collateralClaimed}
              contributionAmount={circle.contribution_amount}
              memberCount={circle.member_count}
              maxMembers={circle.max_members}
              members={data.members}
              currentRound={circle.current_round}
              payoutOrder={circle.payout_order}
              nextPayoutTime={circle.next_payout_time}
              minTrustScore={circle.min_trust_score}
              userTrustScore={data.trustScore?.score ?? null}
              totalRounds={circle.total_rounds}
              joinDeadline={circle.join_deadline}
              hasReceivedPayout={data.hasReceivedPayout}
              isExitedClean={data.isExitedClean}
              onSuccess={refreshAfterTx}
            />
          )}
        </>
      )}
    </PageShell>
  );
}
