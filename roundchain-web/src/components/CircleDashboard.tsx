"use client";

import {
  CircleState,
  MemberDetail,
  formatUsdc,
  shortenAddress,
  timeRemaining,
} from "@/lib/contract";
import { calculateRoundPot, formatPeriod } from "@/lib/circle-logic";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Props {
  circle: CircleState;
  members: MemberDetail[];
  circleId: number;
}

export function CircleDashboard({ circle, members, circleId }: Props) {
  const pot = calculateRoundPot(members, circle.contribution_amount);
  const activeCount = members.filter((m) => !m.is_slashed).length;
  const progress =
    circle.total_rounds > 0
      ? Math.round((circle.current_round / circle.total_rounds) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">Arisan #{circleId}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {formatUsdc(circle.contribution_amount)} USDC <span className="text-slate-500">/ ronde</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={circle.status} />
          </div>
        </div>
        {circle.status === "Active" && (
          <div className="card min-w-[140px] px-5 py-4 text-right">
            <p className="text-xs text-slate-500">Ronde</p>
            <p className="stat-value">
              {circle.current_round + 1}{" "}
              <span className="text-slate-500">/ {circle.total_rounds}</span>
            </p>
            <p className="mt-1 text-xs text-violet-300">{timeRemaining(circle.next_payout_time)}</p>
          </div>
        )}
      </div>

      {circle.status === "Active" && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Progress arisan</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-500"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Peserta" value={`${circle.member_count} / ${circle.max_members}`} />
        <Stat label="Periode ronde" value={formatPeriod(circle.period_duration)} />
        <Stat
          label="Pot ronde ini"
          value={`${formatUsdc(pot)} USDC`}
          sub={circle.status === "Active" ? `${activeCount} peserta aktif` : undefined}
        />
      </div>

      <MemberList members={members} contributionAmount={circle.contribution_amount} />

      <PayoutTracker
        payoutOrder={circle.payout_order}
        currentRound={circle.current_round}
        totalRounds={circle.total_rounds}
        status={circle.status}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="stat-value mt-1">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

function memberLabel(address: string, index: number) {
  return `Peserta ${index + 1} · ${shortenAddress(address, 4)}`;
}

function MemberList({
  members,
  contributionAmount,
}: {
  members: MemberDetail[];
  contributionAmount: bigint;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-semibold text-white">Daftar peserta</h2>
      <ul className="mt-4 space-y-2">
        {members.map((entry, i) => (
          <li
            key={entry.address}
            className="flex flex-col gap-2 rounded-xl bg-slate-950/40 px-4 py-3 ring-1 ring-slate-800/60 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span className="text-sm font-medium text-slate-200">
                {memberLabel(entry.address, i)}
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {entry.is_slashed && <Badge color="red">Dipotong</Badge>}
                {entry.has_received_payout && <Badge color="blue">Sudah terima</Badge>}
                {entry.collateral_claimed && <Badge color="slate">Collateral diambil</Badge>}
              </div>
            </div>
            <div className="text-left text-sm sm:text-right">
              {entry.is_slashed ? (
                <p className="text-red-400">Collateral hangus</p>
              ) : (
                <p className={entry.paid ? "text-emerald-400" : "text-amber-400"}>
                  {entry.paid
                    ? "Iuran lunas"
                    : `Belum bayar ${formatUsdc(contributionAmount)}`}
                </p>
              )}
              <p className="text-xs text-slate-600">
                Collateral {formatUsdc(entry.collateral_deposited)} USDC
              </p>
            </div>
          </li>
        ))}
        {members.length === 0 && (
          <li className="py-8 text-center text-sm text-slate-500">
            Belum ada peserta — bagikan link undangan
          </li>
        )}
      </ul>
    </section>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    red: "bg-red-500/10 text-red-300 ring-red-500/20",
    blue: "bg-blue-500/10 text-blue-300 ring-blue-500/20",
    slate: "bg-slate-800 text-slate-400 ring-slate-700/50",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${colors[color] ?? colors.slate}`}
    >
      {children}
    </span>
  );
}

function PayoutTracker({
  payoutOrder,
  currentRound,
  totalRounds,
  status,
}: {
  payoutOrder: string[];
  currentRound: number;
  totalRounds: number;
  status: string;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-semibold text-white">Urutan giliran</h2>
      <p className="mt-1 text-sm text-slate-500">
        {status === "Pending"
          ? "Urutan final diacak on-chain saat pengelola mulai arisan"
          : `Setiap peserta terima pot penuh sekali selama ${totalRounds} ronde`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {payoutOrder.map((addr, i) => {
          const isCurrent = i === currentRound;
          const isPast = i < currentRound;
          return (
            <div
              key={`${addr}-${i}`}
              className={`rounded-xl px-3 py-2 font-mono text-xs ${
                isCurrent
                  ? "bg-violet-500/15 text-violet-200 ring-2 ring-violet-500/40"
                  : isPast
                    ? "bg-slate-900/60 text-slate-600 line-through"
                    : "bg-slate-950/80 text-slate-400 ring-1 ring-slate-800"
              }`}
            >
              R{i + 1}: {shortenAddress(addr, 4)}
              {isCurrent && <span className="ml-1.5 text-violet-400">← giliran</span>}
            </div>
          );
        })}
        {payoutOrder.length === 0 && status !== "Pending" && (
          <p className="text-sm text-slate-500">Belum ada peserta</p>
        )}
      </div>
    </section>
  );
}
