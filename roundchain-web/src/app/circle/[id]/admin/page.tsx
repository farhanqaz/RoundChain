"use client";

import { useParams } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { CircleSkeleton } from "@/components/CircleSkeleton";
import { ConnectWallet } from "@/components/ConnectWallet";
import { Alert } from "@/components/ui/Alert";
import { useWallet } from "@/providers/WalletProvider";
import { useCircle } from "@/hooks/useCircle";

export default function CircleAdminPage() {
  const params = useParams();
  const circleId = parseInt(params.id as string, 10);
  const { address } = useWallet();
  const { data, error, loading, refresh } = useCircle(circleId, address, 10_000);

  if (!address) {
    return (
      <ConnectWallet
        title="Akses pengelola"
        description="Hubungkan dompet yang digunakan saat membuat arisan ini."
      />
    );
  }

  if (loading) return <CircleSkeleton />;

  if (error || !data) {
    return <Alert variant="error">{error ?? "Circle not found"}</Alert>;
  }

  const { circle, members, isAdmin } = data;
  const adminInCircle = circle.payout_order.includes(circle.admin);

  return (
    <AdminPanel
      circleId={circleId}
      address={address}
      isAdmin={isAdmin}
      status={circle.status}
      members={members}
      memberCount={circle.member_count}
      maxMembers={circle.max_members}
      currentRound={circle.current_round}
      payoutOrder={circle.payout_order}
      nextPayoutTime={circle.next_payout_time}
      adminInCircle={adminInCircle}
      onSuccess={() => refresh(true)}
    />
  );
}
