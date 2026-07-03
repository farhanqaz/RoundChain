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
      setError("Kontrak belum dikonfigurasi");
      setLoading(false);
      return;
    }
    listCircles()
      .then(setCircles)
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CircleSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader
        label="Arisan"
        title="Daftar arisan"
        description="Semua arisan yang terdaftar di jaringan. Pilih untuk melihat detail atau bergabung."
        action={
          <Link href="/create" className="btn-primary px-5 py-2.5 text-sm">
            Buat baru
            <IconArrowRight />
          </Link>
        }
      />

      {error && <div className="card border-red-800/40 p-5 text-red-300">{error}</div>}

      {!error && circles.length === 0 && (
        <EmptyState
          icon={<IconUsers className="h-7 w-7" />}
          title="Belum ada arisan"
          description="Buat arisan pertama dan undang peserta melalui link undangan."
          action={{ label: "Buat arisan", href: "/create" }}
          secondary={{ label: "Latihan di sandbox", href: "/demo" }}
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
                    <p className="font-semibold text-white group-hover:text-violet-200">
                      Arisan #{id}
                    </p>
                    {open && <span className="pill-emerald">Terbuka</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatUsdc(circle.contribution_amount)} USDC · {formatPeriod(circle.period_duration)}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 max-w-[140px] flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-violet-500/80" style={{ width: `${fillPct}%` }} />
                    </div>
                    <span className="text-xs text-slate-600">
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
