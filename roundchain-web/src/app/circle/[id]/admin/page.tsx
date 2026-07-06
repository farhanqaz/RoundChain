"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy route — all circle actions live on the main dashboard. */
export default function CircleAdminRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.id as string;

  useEffect(() => {
    router.replace(`/circle/${circleId}`);
  }, [circleId, router]);

  return (
    <p className="text-sm text-muted">Redirecting to circle dashboard…</p>
  );
}
