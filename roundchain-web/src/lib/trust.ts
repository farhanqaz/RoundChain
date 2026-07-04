export const TRUST_POINTS_COMPLETED = 10;
export const TRUST_PENALTY_DEFAULTED = 25;

export function computeTrustScore(completed: number, defaulted: number): number {
  return Math.max(0, completed * TRUST_POINTS_COMPLETED - defaulted * TRUST_PENALTY_DEFAULTED);
}

export function trustTier(score: number): { label: string; className: string } {
  if (score >= 30) return { label: "Trusted", className: "pill-emerald" };
  if (score >= 10) return { label: "Building", className: "pill-violet" };
  return { label: "New", className: "pill-amber" };
}

export function circlesToReachScore(target: number): number {
  if (target <= 0) return 0;
  return Math.ceil(target / TRUST_POINTS_COMPLETED);
}
