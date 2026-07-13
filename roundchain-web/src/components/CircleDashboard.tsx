"use client";

import {
  CircleState,
  MemberDetail,
  collateralForCircle,
  formatUsdc,
  shortenAddress,
  timeRemaining,
} from "@/lib/contract";
import { calculateRoundPot, formatFeePercent, formatPeriod, isJoinDeadlinePassed, isScheduledRecipient, netPotAfterFee, roundObligationMet } from "@/lib/circle-logic";
import { useFeeConfig } from "@/hooks/useFeeConfig";
import { CircleFlowViz } from "@/components/CircleFlowViz";
import { MemberSeatGrid } from "@/components/MemberSeatGrid";
import { AnimatedProgress } from "@/components/ui/AnimatedProgress";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Props {
  circle: CircleState;
  members: MemberDetail[];
  circleId: number;
}

export function CircleDashboard({ circle, members, circleId }: Props) {
  const feeBps = useFeeConfig();
  const pot = calculateRoundPot(
    members,
    circle.contribution_amount,
    circle.payout_order,
    circle.status === "Active" ? circle.current_round : 0
  );
  const netPot = netPotAfterFee(pot, feeBps);
  const activeCount = members.filter((m) => !m.is_slashed && !m.is_exited_clean).length;
  const joinCollateral =
    circle.status === "Pending"
      ? collateralForCircle(circle.contribution_amount, circle.max_members)
      : BigInt(0);
  const joinClosed =
    circle.status === "Pending" &&
    circle.join_deadline > BigInt(0) &&
    isJoinDeadlinePassed(circle.join_deadline);
  const joinOpen =
    circle.status === "Pending" &&
    circle.join_deadline > BigInt(0) &&
    !joinClosed;
  const joinIncomplete =
    circle.status === "Pending" &&
    circle.member_count > 0 &&
    circle.member_count < circle.max_members;
  const progress =
    circle.total_rounds > 0
      ? Math.round((circle.current_round / circle.total_rounds) * 100)
      : 0;
  const fillPct =
    circle.max_members > 0
      ? Math.round((circle.member_count / circle.max_members) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div className="stagger-item flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">Circle #{circleId}</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            {formatUsdc(circle.contribution_amount)} USDC <span className="text-muted">/ round</span>
          </h1>
          <div className="mt-3">
            <StatusBadge status={circle.status} joinClosed={joinClosed} />
          </div>
        </div>
        {circle.status === "Active" && (
          <div className="stagger-item stagger-2 min-w-[120px] text-right">
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
        <div className="stagger-item stagger-2 space-y-2">
          <div className="flex justify-between text-xs text-muted">
            <span>Circle progress</span>
            <span>{progress}%</span>
          </div>
          <AnimatedProgress value={progress} highlight />
        </div>
      )}

      {joinClosed && joinIncomplete && (
        <Alert variant="warning" title="Join window closed">
          This circle did not fill in time. Anyone can cancel to refund deposited collateral — funds
          are not lost.
        </Alert>
      )}

      {circle.status === "Pending" && (
        <div className="stagger-item stagger-2 space-y-3 rounded-md border border-border bg-muted-surface/40 p-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Seats filled</span>
            <span>
              {circle.member_count}/{circle.max_members}
            </span>
          </div>
          <MemberSeatGrid filled={circle.member_count} total={circle.max_members} />
          <AnimatedProgress value={fillPct} highlight />
        </div>
      )}

      {circle.status === "Active" && members.length > 0 && (
        <CircleFlowViz
          members={members}
          payoutOrder={circle.payout_order}
          currentRound={circle.current_round}
          netPot={netPot}
          contributionAmount={circle.contribution_amount}
        />
      )}

      <div className="stagger-item stagger-3 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Members" value={`${circle.member_count} / ${circle.max_members}`} delay={0} />
        <Stat label="Round period" value={formatPeriod(circle.period_duration)} delay={1} />
        {circle.status === "Pending" && (
          <>
            <Stat
              label="Join deposit"
              value={`${formatUsdc(joinCollateral)} USDC`}
              sub="Collateral per member"
              delay={2}
            />
            <Stat
              label="Join by"
              value={joinOpen ? timeRemaining(circle.join_deadline) : "Closed"}
              delay={3}
            />
          </>
        )}
        {circle.status === "Active" && (
          <Stat
            label="This round's pot"
            value={`${formatUsdc(netPot)} USDC`}
            sub={`${activeCount} active · ${formatFeePercent(feeBps)} fee on release`}
            delay={2}
          />
        )}
        {circle.min_trust_score != null && circle.min_trust_score > 0 && (
          <Stat
            label="Min. trust score"
            value={`${circle.min_trust_score} pts`}
            sub="Required to join"
            delay={4}
          />
        )}
      </div>

      <MemberList
        members={members}
        contributionAmount={circle.contribution_amount}
        payoutOrder={circle.payout_order}
        currentRound={circle.status === "Active" ? circle.current_round : 0}
        isActive={circle.status === "Active"}
      />

      <PayoutTracker
        payoutOrder={circle.payout_order}
        currentRound={circle.current_round}
        totalRounds={circle.total_rounds}
        status={circle.status}
        feeBps={feeBps}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  delay?: number;
}) {
  return (
    <div
      className="stagger-item bg-card p-4"
      style={{ animationDelay: `${0.1 + delay * 0.05}s` }}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className="stat-value mt-1">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function memberLabel(address: string, index: number) {
  return `Member ${index + 1} · ${shortenAddress(address, 4)}`;
}

function paymentStatus(
  entry: MemberDetail,
  contributionAmount: bigint,
  payoutOrder: string[],
  currentRound: number,
  isActive: boolean
) {
  const displayRound = currentRound + 1;
  if (entry.is_slashed) return { label: "Collateral forfeited", paid: false, slashed: true, receiving: false };
  if (entry.is_exited_clean) return { label: "Prepaid · exited", paid: true, slashed: false, receiving: false };
  if (!isActive) {
    if (entry.collateral_deposited > BigInt(0)) {
      return { label: "Collateral deposited", paid: true, slashed: false, receiving: false };
    }
    return { label: "Enrolled", paid: false, slashed: false, receiving: false };
  }
  if (isActive && isScheduledRecipient(entry.address, payoutOrder, currentRound)) {
    return { label: `Receiving round ${displayRound}`, paid: true, slashed: false, receiving: true };
  }
  if (roundObligationMet(entry, payoutOrder, currentRound)) {
    return { label: `Paid round ${displayRound}`, paid: true, slashed: false, receiving: false };
  }
  return {
    label: `Owes round ${displayRound} · ${formatUsdc(contributionAmount)}`,
    paid: false,
    slashed: false,
    receiving: false,
  };
}

function MemberList({
  members,
  contributionAmount,
  payoutOrder,
  currentRound,
  isActive,
}: {
  members: MemberDetail[];
  contributionAmount: bigint;
  payoutOrder: string[];
  currentRound: number;
  isActive: boolean;
}) {
  return (
    <section className="stagger-item stagger-4">
      <h2 className="text-sm font-medium text-foreground">Members</h2>
      <ul className="mt-4 divide-y divide-border border-t border-border">
        {members.map((entry, i) => {
          const status = paymentStatus(entry, contributionAmount, payoutOrder, currentRound, isActive);
          return (
            <li
              key={entry.address}
              className="stagger-item flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              style={{ animationDelay: `${0.15 + i * 0.06}s` }}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    status.slashed
                      ? "bg-muted"
                      : status.paid
                        ? "bg-foreground"
                        : "border border-muted bg-transparent"
                  } ${status.paid && !status.slashed ? "animate-pulse-soft" : ""}`}
                  aria-hidden
                />
                <div>
                  <span className="text-sm text-foreground">
                    {memberLabel(entry.address, i)}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {entry.is_slashed && <Badge>Slashed</Badge>}
                    {entry.is_exited_clean && <Badge>Exited</Badge>}
                    {entry.has_received_payout && <Badge>Paid out</Badge>}
                {status.receiving && <Badge>Recipient</Badge>}
                    {entry.collateral_claimed && <Badge>Collateral claimed</Badge>}
                  </div>
                </div>
              </div>
              <div className="pl-5 text-left text-sm sm:pl-0 sm:text-right">
                <p className={status.paid ? "text-foreground" : "text-muted"}>{status.label}</p>
                <p className="text-xs text-muted">
                  Collateral {formatUsdc(entry.collateral_deposited)} USDC
                </p>
              </div>
            </li>
          );
        })}
        {members.length === 0 && (
          <li className="py-8 text-center text-sm text-muted">
            Waiting for the creator to enroll…
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
  feeBps,
}: {
  payoutOrder: string[];
  currentRound: number;
  totalRounds: number;
  status: string;
  feeBps: number;
}) {
  if (payoutOrder.length === 0 && status === "Pending") {
    return (
      <section className="stagger-item stagger-5">
        <h2 className="text-sm font-medium text-foreground">Payout order</h2>
        <p className="mt-1 text-sm text-muted">
          Shuffled on-chain when the last member joins
        </p>
      </section>
    );
  }

  return (
    <section className="stagger-item stagger-5">
      <h2 className="text-sm font-medium text-foreground">Payout order</h2>
      <p className="mt-1 text-sm text-muted">
        {status === "Pending"
          ? "Payout order is shuffled on-chain when the last member joins"
          : `Who receives the pot each round (${totalRounds} rounds total · ${formatFeePercent(feeBps)} fee on release). This is not the payment schedule.`}
      </p>

      {status === "Active" && payoutOrder.length > 1 && (
        <div className="relative mt-6 hidden sm:block">
          <div className="absolute left-0 right-0 top-3 h-px bg-border" />
          <div className="relative flex justify-between">
            {payoutOrder.map((addr, i) => {
              const isCurrent = i === currentRound;
              const isPast = i < currentRound;
              return (
                <div
                  key={`timeline-${addr}-${i}`}
                  className="flex flex-col items-center"
                  style={{ width: `${100 / payoutOrder.length}%` }}
                >
                  <div
                    className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-medium transition-all duration-300 ${
                      isCurrent
                        ? "border-foreground bg-foreground text-background payout-pill-current"
                        : isPast
                          ? "border-foreground/40 bg-card text-muted"
                          : "border-border bg-card text-muted"
                    }`}
                  >
                    {isPast ? "✓" : i + 1}
                  </div>
                  <p className="mt-2 max-w-[5rem] text-center text-[10px] text-muted">
                    <span className="block font-medium text-foreground/80">Rnd {i + 1}</span>
                    <span className="font-mono">{shortenAddress(addr, 3)}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {payoutOrder.map((addr, i) => {
          const isCurrent = status === "Active" && i === currentRound;
          const isPast = status === "Active" && i < currentRound;
          return (
            <div
              key={`${addr}-${i}`}
              className={`stagger-item rounded-md border px-3 py-1.5 font-mono text-xs transition-all duration-300 ${
                isCurrent
                  ? "border-foreground text-foreground payout-pill-current"
                  : isPast
                    ? "border-border text-muted line-through opacity-60"
                    : "border-border text-muted"
              }`}
              style={{ animationDelay: `${0.2 + i * 0.05}s` }}
            >
              {status === "Pending" ? (
                <>
                  <span className="text-muted">Seat {i + 1} ·</span> {shortenAddress(addr, 4)}
                  <span className="ml-1 text-muted">· enrolled</span>
                </>
              ) : (
                <>
                  <span className="text-muted">Round {i + 1} ·</span> {shortenAddress(addr, 4)}
                  {isCurrent && <span className="ml-1 text-muted">· receiving now</span>}
                  {!isCurrent && !isPast && <span className="ml-1 text-muted">· receives later</span>}
                </>
              )}
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
