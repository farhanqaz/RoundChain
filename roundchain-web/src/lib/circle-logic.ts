import { PLATFORM_FEE_BPS } from "./constants";
import { MemberDetail } from "./contract";

export function formatPeriod(seconds: bigint): string {
  const s = Number(seconds);
  if (s < 60) return `${s}s`;
  if (s < 86400) {
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m} min`;
  }
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days} day${days > 1 ? "s" : ""}`;
}

export function timeRemaining(nextPayoutTime: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const diff = nextPayoutTime - now;
  if (diff <= BigInt(0)) return "Ready to claim";
  const total = Number(diff);
  if (total < 60) return `${total}s remaining`;
  if (total < 3600) return `${Math.ceil(total / 60)}m remaining`;
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m remaining` : `${hours}h remaining`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h remaining`;
}

export function isPeriodEnded(nextPayoutTime: bigint): boolean {
  return BigInt(Math.floor(Date.now() / 1000)) >= nextPayoutTime;
}

export function isJoinDeadlinePassed(deadline: bigint): boolean {
  return BigInt(Math.floor(Date.now() / 1000)) >= deadline;
}

export function activeMembers(members: MemberDetail[]): MemberDetail[] {
  return members.filter((m) => !m.is_slashed && !m.is_exited_clean);
}

export function scheduledRecipient(
  payoutOrder: string[],
  currentRound: number
): string | null {
  return payoutOrder[currentRound] ?? null;
}

export function isScheduledRecipient(
  address: string,
  payoutOrder: string[],
  currentRound: number
): boolean {
  return scheduledRecipient(payoutOrder, currentRound) === address;
}

/** Members who must pay this round (excludes scheduled recipient). */
export function contributingMembers(
  members: MemberDetail[],
  payoutOrder: string[],
  currentRound: number
): MemberDetail[] {
  const recipient = scheduledRecipient(payoutOrder, currentRound);
  return activeMembers(members).filter((m) => m.address !== recipient);
}

export function calculateRoundPot(
  members: MemberDetail[],
  contributionAmount: bigint,
  payoutOrder: string[],
  currentRound: number
): bigint {
  const recipient = payoutOrder[currentRound];
  let pot = BigInt(0);
  for (const m of members) {
    if (m.address === recipient) continue;
    if (m.is_slashed || !m.paid) continue;
    pot += contributionAmount;
  }
  const fullPot =
    BigInt(contributingMembers(members, payoutOrder, currentRound).length) *
    contributionAmount;
  if (pot < fullPot && allContributorsPaid(members, payoutOrder, currentRound)) {
    pot = fullPot;
  }
  return pot;
}

export function allContributorsPaid(
  members: MemberDetail[],
  payoutOrder: string[],
  currentRound: number
): boolean {
  const contributors = contributingMembers(members, payoutOrder, currentRound);
  return contributors.length > 0 && contributors.every((m) => m.paid);
}

/** @deprecated use allContributorsPaid — kept for tests */
export function allActivePaid(members: MemberDetail[]): boolean {
  const active = activeMembers(members);
  return active.length > 0 && active.every((m) => m.paid);
}

export function activeDefaulters(
  members: MemberDetail[],
  payoutOrder: string[],
  currentRound: number
): MemberDetail[] {
  return contributingMembers(members, payoutOrder, currentRound).filter((m) => !m.paid);
}

/** True when anyone may call trigger_payout on-chain. */
export function canTriggerPayout(
  members: MemberDetail[],
  payoutOrder: string[],
  currentRound: number,
  nextPayoutTime: bigint,
  status: string
): boolean {
  if (status !== "Active") return false;
  if (!isPeriodEnded(nextPayoutTime)) return false;
  if (!allContributorsPaid(members, payoutOrder, currentRound)) return false;
  return true;
}

export function canRecipientClaimPayout(
  address: string,
  members: MemberDetail[],
  payoutOrder: string[],
  currentRound: number,
  nextPayoutTime: bigint,
  status: string
): boolean {
  const recipient = scheduledRecipient(payoutOrder, currentRound);
  if (!recipient || recipient !== address) return false;
  return canTriggerPayout(members, payoutOrder, currentRound, nextPayoutTime, status);
}

export function memberHasPaidRound(member: MemberDetail): boolean {
  return member.paid;
}

export function memberMustPayThisRound(
  address: string,
  payoutOrder: string[],
  currentRound: number
): boolean {
  return !isScheduledRecipient(address, payoutOrder, currentRound);
}

/** Matches on-chain exit_circle: blocked if paid this round or before period ends while unpaid. */
export function canVoluntaryExit(hasPaidThisRound: boolean, nextPayoutTime: bigint): boolean {
  if (hasPaidThisRound) return false;
  return isPeriodEnded(nextPayoutTime);
}

export function remainingSettlementRounds(
  totalRounds: number,
  currentRound: number
): number {
  return Math.max(0, totalRounds - currentRound);
}

export function formatFeePercent(feeBps: number): string {
  const pct = feeBps / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

/** Gross pot minus platform fee (matches on-chain trigger_payout). */
export function netPotAfterFee(
  grossPot: bigint,
  feeBps: number = PLATFORM_FEE_BPS
): bigint {
  if (grossPot <= BigInt(0) || feeBps <= 0) return grossPot;
  const fee = (grossPot * BigInt(feeBps)) / BigInt(10_000);
  return grossPot - fee;
}
