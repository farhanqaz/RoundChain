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

export default function JoinCirclePage() {
  const params = useParams();
  const circleId = parseInt(params.id as string, 10);
  const { address } = useWallet();
  const { data, error, loading, refresh } = useCircle(circleId, address);

  if (loading) return <CircleSkeleton />;

  const circle = data?.circle;
  const seatsLeft = circle ? circle.max_members - circle.member_count : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        label="Undangan"
        title={circle ? `Arisan #${circleId}` : `Arisan #${circleId}`}
        description="Setor jaminan sekali saat join, lalu bayar iuran setiap ronde hingga giliran penerima Anda."
        badge={circle ? <StatusBadge status={circle.status} /> : undefined}
      />

      {circle?.status === "Pending" && seatsLeft > 0 && (
        <p className="-mt-4 pill-amber w-fit">{seatsLeft} slot tersisa</p>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {circle && data && (
        <>
          {circle.status !== "Pending" && (
            <Alert variant="info">
              Arisan sudah berjalan atau selesai.{" "}
              <Link href={`/circle/${circleId}`} className="underline">Buka halaman arisan</Link>
            </Alert>
          )}

          {circle.status === "Pending" && seatsLeft === 0 && (
            <Alert variant="info">Semua slot peserta sudah terisi.</Alert>
          )}

          <CircleDashboard circle={circle} members={data.members} circleId={circleId} />

          {!address && (
            <ConnectWallet
              title="Hubungkan dompet"
              description="Diperlukan untuk join dan setor jaminan arisan."
            />
          )}

          {address && data.isMember && (
            <Alert variant="success">
              Anda sudah terdaftar.{" "}
              <Link href={`/circle/${circleId}`} className="underline">Ke halaman arisan</Link>
            </Alert>
          )}

          {address && !data.isMember && circle.status === "Pending" && seatsLeft > 0 && (
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
              onSuccess={() => refresh(true)}
            />
          )}
        </>
      )}
    </div>
  );
}
