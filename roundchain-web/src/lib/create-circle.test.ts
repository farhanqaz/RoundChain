import { describe, expect, it } from "vitest";
import {
  demoCircleParams,
  demoCircleValidation,
  joinDeadlineFromDays,
  validateCreateCircle,
} from "./create-circle";
import { DEMO_CONTRIBUTION, DEMO_MAX_MEMBERS, DEMO_PERIOD_SECONDS } from "./constants";
import { collateralForCircle } from "./contract";

describe("validateCreateCircle", () => {
  const collateral = collateralForCircle(BigInt(DEMO_CONTRIBUTION), DEMO_MAX_MEMBERS);

  it("accepts demo preset with enough balance", () => {
    expect(validateCreateCircle(demoCircleValidation(collateral))).toBeNull();
  });

  it("rejects demo preset without collateral", () => {
    expect(validateCreateCircle(demoCircleValidation(collateral - BigInt(1)))).toMatch(
      /collateral/
    );
  });

  it("rejects regular create with period under 1 day", () => {
    expect(
      validateCreateCircle({
        contributionAmount: BigInt(10_000_000),
        maxMembers: 5,
        periodDuration: BigInt(3600),
        joinWindowDays: 30,
        minTrustScore: null,
        usdcBalance: BigInt(100_000_000),
      })
    ).toMatch(/1 day/);
  });
});

describe("demoCircleParams", () => {
  it("matches sandbox constants", () => {
    const params = demoCircleParams("GCREATOR");
    expect(params.creator).toBe("GCREATOR");
    expect(params.contributionAmount).toBe(BigInt(DEMO_CONTRIBUTION));
    expect(params.periodDuration).toBe(BigInt(DEMO_PERIOD_SECONDS));
    expect(params.maxMembers).toBe(DEMO_MAX_MEMBERS);
    expect(params.minTrustScore).toBeNull();
  });
});

describe("joinDeadlineFromDays", () => {
  it("is in the future", () => {
    const now = Math.floor(Date.now() / 1000);
    const deadline = Number(joinDeadlineFromDays(1));
    expect(deadline).toBeGreaterThan(now);
    expect(deadline).toBeLessThanOrEqual(now + 86400 + 5);
  });
});
