"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleSkeleton } from "@/components/CircleSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconArrowRight, IconUsers } from "@/components/icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CONTRACT_ID } from "@/lib/constants";
import { CircleState, formatPeriod, formatUsdc, listCircles } from "@/lib/contract";

export default function CirclesPage() {
  const [circles, setCircles] = useState<Array<{ id: number; circle: CircleState }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CONTRACT_ID) {
      setError("Contract not configured");
      setLoading(false);
      return;
    }
    listCircles()
      .then(setCircles)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CircleSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader
        label="Circles"
        title="Browse circles"
        description="All circles registered on-chain. Open one to view details or join."
        action={
          <Link href="/create" className="btn-primary px-5 py-2.5 text-sm">
            Create new
            <IconArrowRight />
          </Link>
        }
      />

      {error && <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}

      {!error && circles.length === 0 && (
        <EmptyState
          icon={<IconUsers className="h-7 w-7" />}
          title="No circles yet"
          description="Create the first circle and invite members with a share link."
          action={{ label: "Create circle", href: "/create" }}
          secondary={{ label: "Try the sandbox", href: "/demo" }}
        />
      )}

      <ul className="space-y-3">
        {circles.map(({ id, circle }) => {
          const open = circle.status === "Pending" && circle.member_count < circle.max_members;
          const fillPct = Math.round((circle.member_count / circle.max_members) * 100);
          return (
            <li key={id}>
              <Link
                href={open ? `/join/${id}` : `/circle/${id}`}
                className="card-hover group flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground group-hover:underline">
                      Circle #{id}
                    </p>
                    {open && <span className="pill-emerald">Open</span>}
                    {circle.min_trust_score != null && circle.min_trust_score > 0 && (
                      <span className="pill-amber">Trust {circle.min_trust_score}+</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatUsdc(circle.contribution_amount)} USDC · {formatPeriod(circle.period_duration)}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-px max-w-[140px] flex-1 bg-border">
                      <div className="h-px bg-foreground" style={{ width: `${fillPct}%` }} />
                    </div>
                    <span className="text-xs text-muted">
                      {circle.member_count}/{circle.max_members}
                    </span>
                  </div>
                </div>
                <StatusBadge status={circle.status} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
