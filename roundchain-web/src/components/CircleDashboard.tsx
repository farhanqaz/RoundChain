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
  const pot = calculateRoundPot(
    members,
    circle.contribution_amount,
    circle.payout_order,
    circle.status === "Active" ? circle.current_round : 0
  );
  const activeCount = members.filter((m) => !m.is_slashed && !m.is_exited_clean).length;
  const progress =
    circle.total_rounds > 0
      ? Math.round((circle.current_round / circle.total_rounds) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">Circle #{circleId}</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            {formatUsdc(circle.contribution_amount)} USDC <span className="text-muted">/ round</span>
          </h1>
          <div className="mt-3">
            <StatusBadge status={circle.status} />
          </div>
        </div>
        {circle.status === "Active" && (
          <div className="min-w-[120px] text-right">
            <p className="text-xs text-muted">Round</p>
            <p className="stat-value">
              {circle.current_round + 1}{" "}
              <span className="text-muted">/ {circle.total_rounds}</span>
            </p>
            <p className="mt-1 text-xs text-muted">{timeRemaining(circle.next_payout_time)}</p>
          </div>
        )}
      </div>

      {circle.status === "Active" && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-px bg-border">
            <div
              className="h-px bg-foreground transition-all duration-500"
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Members" value={`${circle.member_count} / ${circle.max_members}`} />
        <Stat label="Round period" value={formatPeriod(circle.period_duration)} />
        <Stat
          label="This round's pot"
          value={`${formatUsdc(pot)} USDC`}
          sub={circle.status === "Active" ? `${activeCount} active` : undefined}
        />
        {circle.min_trust_score != null && circle.min_trust_score > 0 && (
          <Stat
            label="Min. trust score"
            value={`${circle.min_trust_score} pts`}
            sub="Required to join"
          />
        )}
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
    <div className="bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="stat-value mt-1">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function memberLabel(address: string, index: number) {
  return `Member ${index + 1} · ${shortenAddress(address, 4)}`;
}

function MemberList({
  members,
  contributionAmount,
}: {
  members: MemberDetail[];
  contributionAmount: bigint;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium text-foreground">Members</h2>
      <ul className="mt-4 divide-y divide-border border-t border-border">
        {members.map((entry, i) => (
          <li
            key={entry.address}
            className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span className="text-sm text-foreground">
                {memberLabel(entry.address, i)}
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {entry.is_slashed && <Badge>Slashed</Badge>}
                {entry.has_received_payout && <Badge>Paid out</Badge>}
                {entry.collateral_claimed && <Badge>Collateral claimed</Badge>}
              </div>
            </div>
            <div className="text-left text-sm sm:text-right">
              {entry.is_slashed ? (
                <p className="text-muted">Collateral forfeited</p>
              ) : (
                <p className={entry.paid ? "text-foreground" : "text-muted"}>
                  {entry.paid
                    ? "Paid this round"
                    : `Owes ${formatUsdc(contributionAmount)}`}
                </p>
              )}
              <p className="text-xs text-muted">
                Collateral {formatUsdc(entry.collateral_deposited)} USDC
              </p>
            </div>
          </li>
        ))}
        {members.length === 0 && (
          <li className="py-8 text-center text-sm text-muted">
            No members yet — share the invite link
          </li>
        )}
      </ul>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] uppercase tracking-wide text-muted">
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
    <section>
      <h2 className="text-sm font-medium text-foreground">Payout order</h2>
      <p className="mt-1 text-sm text-muted">
        {status === "Pending"
          ? "Payout order is shuffled on-chain when the last member joins"
          : `Each member receives the full pot once across ${totalRounds} rounds`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {payoutOrder.map((addr, i) => {
          const isCurrent = i === currentRound;
          const isPast = i < currentRound;
          return (
            <div
              key={`${addr}-${i}`}
              className={`rounded-md border px-3 py-1.5 font-mono text-xs ${
                isCurrent
                  ? "border-foreground text-foreground"
                  : isPast
                    ? "border-border text-muted line-through"
                    : "border-border text-muted"
              }`}
            >
              R{i + 1}: {shortenAddress(addr, 4)}
              {isCurrent && <span className="ml-1 text-muted">· now</span>}
            </div>
          );
        })}
        {payoutOrder.length === 0 && status !== "Pending" && (
          <p className="text-sm text-muted">No members yet</p>
        )}
      </div>
    </section>
  );
}
