import { MemberDetail } from "./contract";

export function formatPeriod(seconds: bigint): string {
  const s = Number(seconds);
  if (s < 3600) return `${s}s`;
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
  if (diff <= BigInt(0)) return "Siap terima uang";
  const total = Number(diff);
  if (total < 60) return `${total} detik lagi`;
  if (total < 3600) return `${Math.ceil(total / 60)} menit lagi`;
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (hours < 24) return mins > 0 ? `${hours} jam ${mins} menit lagi` : `${hours} jam lagi`;
  const days = Math.floor(hours / 24);
  return `${days} hari ${hours % 24} jam lagi`;
}

export function isPeriodEnded(nextPayoutTime: bigint): boolean {
  return BigInt(Math.floor(Date.now() / 1000)) >= nextPayoutTime;
}

export function calculateRoundPot(
  members: MemberDetail[],
  contributionAmount: bigint
): bigint {
  return members.reduce((sum, m) => {
    if (m.is_slashed || !m.paid) return sum;
    return sum + contributionAmount;
  }, BigInt(0));
}

export function activeDefaulters(members: MemberDetail[]): MemberDetail[] {
  return members.filter((m) => !m.is_slashed && !m.paid);
}

export function allActivePaid(members: MemberDetail[]): boolean {
  const active = members.filter((m) => !m.is_slashed);
  return active.length > 0 && active.every((m) => m.paid);
}

export function scheduledRecipient(
  payoutOrder: string[],
  currentRound: number
): string | null {
  return payoutOrder[currentRound] ?? null;
}

export function recipientIsDefaulter(
  members: MemberDetail[],
  payoutOrder: string[],
  currentRound: number
): boolean {
  const recipient = scheduledRecipient(payoutOrder, currentRound);
  if (!recipient) return false;
  const member = members.find((m) => m.address === recipient);
  return !!member && !member.is_slashed && !member.paid;
}

export function canRecipientClaimPayout(
  address: string,
  members: MemberDetail[],
  payoutOrder: string[],
  currentRound: number,
  nextPayoutTime: bigint,
  status: string
): boolean {
  if (status !== "Active") return false;
  const recipient = scheduledRecipient(payoutOrder, currentRound);
  if (!recipient || recipient !== address) return false;
  if (!isPeriodEnded(nextPayoutTime)) return false;
  if (!allActivePaid(members)) return false;
  if (recipientIsDefaulter(members, payoutOrder, currentRound)) return false;
  return true;
}
