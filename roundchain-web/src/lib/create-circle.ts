import {
  DEFAULT_JOIN_WINDOW_DAYS,
  DEMO_CONTRIBUTION,
  DEMO_JOIN_WINDOW_DAYS,
  DEMO_MAX_MEMBERS,
  DEMO_PERIOD_SECONDS,
  USDC_TOKEN,
} from "./constants";
import {
  buildCreateCircleOp,
  collateralForCircle,
  formatUsdc,
  getNextCircleId,
  simulateAndSend,
} from "./contract";

export const MAX_CIRCLE_MEMBERS = 50;
export const MIN_PERIOD_SECONDS = 86400; // 1 day — UI minimum for regular create

export type CreateCircleInput = {
  creator: string;
  token?: string;
  contributionAmount: bigint;
  periodDuration: bigint;
  maxMembers: number;
  minTrustScore?: number | null;
  joinDeadline: bigint;
};

export type CreateCircleValidation = {
  contributionAmount: bigint;
  maxMembers: number;
  periodDuration: bigint;
  joinWindowDays: number;
  minTrustScore?: number | null;
  usdcBalance: bigint | null;
  minPeriodSeconds?: bigint;
  maxMembersLimit?: number;
};

export function joinDeadlineFromDays(days: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + days * 86400);
}

export function validateCreateCircle(input: CreateCircleValidation): string | null {
  const {
    contributionAmount,
    maxMembers,
    periodDuration,
    joinWindowDays,
    minTrustScore,
    usdcBalance,
    minPeriodSeconds = BigInt(MIN_PERIOD_SECONDS),
    maxMembersLimit = MAX_CIRCLE_MEMBERS,
  } = input;

  if (contributionAmount <= BigInt(0)) return "Contribution must be greater than 0";
  if (maxMembers < 2) return "At least 2 members required";
  if (maxMembers > maxMembersLimit) return `Maximum ${maxMembersLimit} members`;
  if (periodDuration < minPeriodSeconds) {
    const minDays = Number(minPeriodSeconds) / 86400;
    return minDays >= 1
      ? "Round length must be at least 1 day"
      : "Round length must be greater than 0";
  }
  if (!Number.isFinite(joinWindowDays) || joinWindowDays < 1) {
    return "Join window must be at least 1 day";
  }

  if (minTrustScore != null && (!Number.isFinite(minTrustScore) || minTrustScore < 0)) {
    return "Trust score must be a non-negative number";
  }

  const collateralAmount = collateralForCircle(contributionAmount, maxMembers);
  if (usdcBalance !== null && usdcBalance < collateralAmount) {
    return `Need ${formatUsdc(collateralAmount)} USDC collateral to create (you have ${formatUsdc(usdcBalance)})`;
  }

  return null;
}

export async function executeCreateCircle(
  creator: string,
  signTx: (xdr: string) => Promise<string>,
  input: CreateCircleInput
): Promise<{ hash: string; circleId: number }> {
  const op = buildCreateCircleOp({
    creator,
    token: input.token ?? USDC_TOKEN,
    contributionAmount: input.contributionAmount,
    periodDuration: input.periodDuration,
    maxMembers: input.maxMembers,
    minTrustScore: input.minTrustScore ?? null,
    joinDeadline: input.joinDeadline,
  });

  const { hash, returnValue } = await simulateAndSend(creator, signTx, op);
  let circleId = returnValue != null ? Number(returnValue) : NaN;
  if (isNaN(circleId)) circleId = (await getNextCircleId()) - 1;
  return { hash, circleId };
}

/** Sandbox preset — same contract path as create, shorter period for quick testing. */
export function demoCircleParams(creator: string): CreateCircleInput {
  return {
    creator,
    token: USDC_TOKEN,
    contributionAmount: BigInt(DEMO_CONTRIBUTION),
    periodDuration: BigInt(DEMO_PERIOD_SECONDS),
    maxMembers: DEMO_MAX_MEMBERS,
    minTrustScore: null,
    joinDeadline: joinDeadlineFromDays(DEMO_JOIN_WINDOW_DAYS),
  };
}

export function demoCircleValidation(usdcBalance: bigint | null): CreateCircleValidation {
  return {
    contributionAmount: BigInt(DEMO_CONTRIBUTION),
    maxMembers: DEMO_MAX_MEMBERS,
    periodDuration: BigInt(DEMO_PERIOD_SECONDS),
    joinWindowDays: DEMO_JOIN_WINDOW_DAYS,
    minTrustScore: null,
    usdcBalance,
    minPeriodSeconds: BigInt(1),
  };
}

export function regularCreateValidation(
  contributionAmount: bigint,
  maxMembers: number,
  periodDuration: bigint,
  joinWindowDays: number,
  minTrustScore: number | null,
  usdcBalance: bigint | null
): CreateCircleValidation {
  return {
    contributionAmount,
    maxMembers,
    periodDuration,
    joinWindowDays: joinWindowDays || DEFAULT_JOIN_WINDOW_DAYS,
    minTrustScore,
    usdcBalance,
  };
}
