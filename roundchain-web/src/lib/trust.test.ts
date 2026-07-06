import { describe, expect, it } from "vitest";
import {
  TRUST_PENALTY_DEFAULTED,
  TRUST_POINTS_COMPLETED,
  circlesToReachScore,
  computeTrustScore,
  trustTier,
} from "./trust";

describe("computeTrustScore", () => {
  it("awards +10 per clean completion", () => {
    expect(computeTrustScore(3, 0)).toBe(30);
    expect(computeTrustScore(1, 0)).toBe(TRUST_POINTS_COMPLETED);
  });

  it("penalizes −25 per default", () => {
    expect(computeTrustScore(0, 1)).toBe(0);
    expect(computeTrustScore(1, 1)).toBe(0);
    expect(computeTrustScore(3, 1)).toBe(5);
  });

  it("never returns negative scores", () => {
    expect(computeTrustScore(0, 5)).toBe(0);
    expect(computeTrustScore(1, 2)).toBe(0);
  });

  it("matches on-chain formula", () => {
    const raw = 2 * TRUST_POINTS_COMPLETED - 1 * TRUST_PENALTY_DEFAULTED;
    expect(computeTrustScore(2, 1)).toBe(Math.max(0, raw));
  });
});

describe("trustTier", () => {
  it("classifies new members", () => {
    expect(trustTier(0).label).toBe("New");
    expect(trustTier(9).label).toBe("New");
  });

  it("classifies building reputation", () => {
    expect(trustTier(10).label).toBe("Building");
    expect(trustTier(29).label).toBe("Building");
  });

  it("classifies trusted members", () => {
    expect(trustTier(30).label).toBe("Trusted");
    expect(trustTier(100).label).toBe("Trusted");
  });
});

describe("circlesToReachScore", () => {
  it("returns zero for non-positive targets", () => {
    expect(circlesToReachScore(0)).toBe(0);
    expect(circlesToReachScore(-5)).toBe(0);
  });

  it("ceil-divides by points per completion", () => {
    expect(circlesToReachScore(10)).toBe(1);
    expect(circlesToReachScore(11)).toBe(2);
    expect(circlesToReachScore(30)).toBe(3);
  });
});
