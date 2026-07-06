"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CircleActions } from "@/components/CircleActions";
import { CircleDashboard } from "@/components/CircleDashboard";
import { CircleSkeleton } from "@/components/CircleSkeleton";
import { ConnectWallet } from "@/components/ConnectWallet";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useWallet } from "@/providers/WalletProvider";
import { useCircle } from "@/hooks/useCircle";
import { PageShell } from "@/components/PageShell";
import { isJoinDeadlinePassed } from "@/lib/circle-logic";

function JoinWindowNote({ deadline }: { deadline: bigint }) {
  const closed = isJoinDeadlinePassed(deadline);
  if (closed) {
    return (
      <Alert variant="warning" title="Join window closed">
        This circle is no longer accepting members.
      </Alert>
    );
  }
  return null;
}

export default function JoinCirclePage() {
  const params = useParams();
  const circleId = parseInt(params.id as string, 10);
  const { address } = useWallet();
  const { data, error, loading, refresh } = useCircle(circleId, address);

  if (loading) return <CircleSkeleton />;

  const circle = data?.circle;
  const seatsLeft = circle ? circle.max_members - circle.member_count : 0;

  return (
    <PageShell className="space-y-8">
      <PageHeader
        label="Invite"
        title={`Circle #${circleId}`}
        description="Deposit collateral once when you join, then pay each round until your payout turn."
        badge={circle ? <StatusBadge status={circle.status} /> : undefined}
      />

      {circle?.status === "Pending" && seatsLeft > 0 && (
        <p className="-mt-4 pill-amber w-fit">{seatsLeft} seat{seatsLeft !== 1 ? "s" : ""} left</p>
      )}

      {circle?.status === "Pending" &&
        circle.join_deadline > BigInt(0) &&
        data &&
        circle.max_members > circle.member_count && (
          <JoinWindowNote deadline={circle.join_deadline} />
        )}

      {error && <Alert variant="error">{error}</Alert>}

      {circle && data && (
        <>
          {circle.status !== "Pending" && (
            <Alert variant="info">
              This circle is already running or finished.{" "}
              <Link href={`/circle/${circleId}`} className="underline">Open circle page</Link>
            </Alert>
          )}

          {circle.status === "Pending" && seatsLeft === 0 && (
            <Alert variant="info">All member slots are filled.</Alert>
          )}

          <CircleDashboard circle={circle} members={data.members} circleId={circleId} />

          {!address && (
            <ConnectWallet
              title="Connect wallet"
              description="Required to join and deposit circle collateral."
            />
          )}

          {address && data.isMember && (
            <Alert variant="success">
              You are already a member.{" "}
              <Link href={`/circle/${circleId}`} className="underline">Go to circle</Link>
            </Alert>
          )}

          {address && !data.isMember && circle.status === "Pending" && seatsLeft > 0 &&
            !(circle.join_deadline > BigInt(0) && isJoinDeadlinePassed(circle.join_deadline)) && (
            <CircleActions
              circleId={circleId}
              address={address}
              tokenId={circle.token}
              status={circle.status}
              isMember={false}
              isSlashed={false}
              hasContributed={false}
              isCompleted={false}
              collateralClaimed={false}
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
              onSuccess={() => refresh(true)}
            />
          )}
        </>
      )}
    </PageShell>
  );
}
