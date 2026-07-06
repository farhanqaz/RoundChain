import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activeDefaulters,
  allActivePaid,
  calculateRoundPot,
  canRecipientClaimPayout,
  formatPeriod,
  isPeriodEnded,
  recipientIsDefaulter,
  scheduledRecipient,
  timeRemaining,
} from "./circle-logic";
import type { MemberDetail } from "./contract";

const MEMBERS = (paid: boolean[]): MemberDetail[] =>
  paid.map((p, i) => ({
    address: `GADDR${i}`,
    paid: p,
    is_slashed: false,
    is_exited_clean: false,
    collateral_deposited: BigInt(0),
    has_received_payout: false,
    collateral_claimed: false,
  }));

const ORDER = ["GADDR0", "GADDR1", "GADDR2"];

describe("formatPeriod", () => {
  it("formats seconds", () => {
    expect(formatPeriod(BigInt(45))).toBe("45s");
  });

  it("formats minutes", () => {
    expect(formatPeriod(BigInt(120))).toBe("2 min");
    expect(formatPeriod(BigInt(90))).toBe("1m 30s");
  });

  it("formats days", () => {
    expect(formatPeriod(BigInt(86400))).toBe("1 day");
    expect(formatPeriod(BigInt(86400 * 2))).toBe("2 days");
    expect(formatPeriod(BigInt(86400 + 3600))).toBe("1d 1h");
  });
});

describe("time helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects ended periods", () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(isPeriodEnded(now - BigInt(1))).toBe(true);
    expect(isPeriodEnded(now + BigInt(60))).toBe(false);
  });

  it("shows ready when period ended", () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(timeRemaining(now - BigInt(1))).toBe("Ready to claim");
  });

  it("formats remaining time", () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(timeRemaining(now + BigInt(30))).toBe("30s remaining");
    expect(timeRemaining(now + BigInt(120))).toBe("2m remaining");
  });
});

describe("round pot", () => {
  it("sums non-recipient paid members (full pot when all paid)", () => {
    const members = MEMBERS([true, true, true]);
    expect(
      calculateRoundPot(members, BigInt(10_000_000), ORDER, 0)
    ).toBe(BigInt(20_000_000));
  });

  it("excludes slashed members", () => {
    const members = MEMBERS([true, true, true]);
    members[2].is_slashed = true;
    members[2].paid = false;
    expect(
      calculateRoundPot(members, BigInt(10_000_000), ORDER, 0)
    ).toBe(BigInt(20_000_000));
  });
});

describe("contribution status", () => {
  it("requires all active members paid", () => {
    expect(allActivePaid(MEMBERS([true, true, false]))).toBe(false);
    expect(allActivePaid(MEMBERS([true, true, true]))).toBe(true);
  });

  it("ignores exited-clean members", () => {
    const members = MEMBERS([true, false, true]);
    members[0].is_exited_clean = true;
    members[0].paid = true;
    expect(allActivePaid(members)).toBe(false);
  });

  it("flags unpaid recipient as defaulter", () => {
    const members = MEMBERS([true, false, true]);
    expect(recipientIsDefaulter(members, ORDER, 1)).toBe(true);
  });

  it("lists active defaulters", () => {
    const members = MEMBERS([true, false, true]);
    expect(activeDefaulters(members).map((m) => m.address)).toEqual(["GADDR1"]);
  });
});

describe("payout claim", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows recipient when period ended and all paid", () => {
    const members = MEMBERS([true, true, true]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(
      canRecipientClaimPayout("GADDR0", members, ORDER, 0, now - BigInt(1), "Active")
    ).toBe(true);
  });

  it("rejects before period ends", () => {
    const members = MEMBERS([true, true, true]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(
      canRecipientClaimPayout("GADDR0", members, ORDER, 0, now + BigInt(60), "Active")
    ).toBe(false);
  });

  it("resolves scheduled recipient", () => {
    expect(scheduledRecipient(ORDER, 1)).toBe("GADDR1");
  });
});
