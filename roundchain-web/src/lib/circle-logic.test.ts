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
  }));

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
  it("sums contributions from active paid members", () => {
    const members = MEMBERS([true, true, false]);
    expect(calculateRoundPot(members, BigInt(10_000_000))).toBe(BigInt(20_000_000));
  });

  it("excludes slashed members", () => {
    const members = MEMBERS([true, true]);
    members[1].is_slashed = true;
    expect(calculateRoundPot(members, BigInt(10_000_000))).toBe(BigInt(10_000_000));
  });
});

describe("contribution status", () => {
  it("lists active defaulters", () => {
    const members = MEMBERS([true, false, false]);
    members[2].is_slashed = true;
    expect(activeDefaulters(members)).toHaveLength(1);
    expect(activeDefaulters(members)[0].address).toBe("GADDR1");
  });

  it("requires all active members paid", () => {
    expect(allActivePaid(MEMBERS([true, true]))).toBe(true);
    expect(allActivePaid(MEMBERS([true, false]))).toBe(false);
    expect(allActivePaid([])).toBe(false);
  });
});

describe("payout scheduling", () => {
  const order = ["GADDR0", "GADDR1", "GADDR2"];

  it("returns recipient for current round", () => {
    expect(scheduledRecipient(order, 0)).toBe("GADDR0");
    expect(scheduledRecipient(order, 2)).toBe("GADDR2");
    expect(scheduledRecipient(order, 5)).toBeNull();
  });

  it("flags unpaid recipient as defaulter", () => {
    const members = MEMBERS([false, true, true]);
    expect(recipientIsDefaulter(members, order, 0)).toBe(true);
    expect(recipientIsDefaulter(members, order, 1)).toBe(false);
  });
});

describe("canRecipientClaimPayout", () => {
  const order = ["GADDR0", "GADDR1"];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows claim when all conditions met", () => {
    const members = MEMBERS([true, true]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const next = now - BigInt(1);
    expect(
      canRecipientClaimPayout("GADDR0", members, order, 0, next, "Active")
    ).toBe(true);
  });

  it("rejects wrong recipient", () => {
    const members = MEMBERS([true, true]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(
      canRecipientClaimPayout("GADDR1", members, order, 0, now - BigInt(1), "Active")
    ).toBe(false);
  });

  it("rejects before period ends", () => {
    const members = MEMBERS([true, true]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(
      canRecipientClaimPayout("GADDR0", members, order, 0, now + BigInt(3600), "Active")
    ).toBe(false);
  });

  it("rejects when contributions incomplete", () => {
    const members = MEMBERS([true, false]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(
      canRecipientClaimPayout("GADDR0", members, order, 0, now - BigInt(1), "Active")
    ).toBe(false);
  });

  it("rejects non-active circles", () => {
    const members = MEMBERS([true, true]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(
      canRecipientClaimPayout("GADDR0", members, order, 0, now - BigInt(1), "Pending")
    ).toBe(false);
  });
});
