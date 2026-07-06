import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activeDefaulters,
  allContributorsPaid,
  calculateRoundPot,
  canRecipientClaimPayout,
  canTriggerPayout,
  canVoluntaryExit,
  formatPeriod,
  isPeriodEnded,
  memberHasPaidRound,
  memberMustPayThisRound,
  netPotAfterFee,
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
  it("sums non-recipient paid members (full pot when contributors paid)", () => {
    const members = MEMBERS([false, true, true]);
    expect(
      calculateRoundPot(members, BigInt(10_000_000), ORDER, 0)
    ).toBe(BigInt(20_000_000));
  });

  it("excludes slashed members — pot is active contributors only", () => {
    const members = MEMBERS([false, true, true]);
    members[2].is_slashed = true;
    members[2].paid = false;
    expect(
      calculateRoundPot(members, BigInt(10_000_000), ORDER, 0)
    ).toBe(BigInt(10_000_000));
  });

  it("deducts platform fee from gross pot", () => {
    expect(netPotAfterFee(BigInt(100_000_000), 100)).toBe(BigInt(99_000_000));
    expect(netPotAfterFee(BigInt(0), 100)).toBe(BigInt(0));
  });
});

describe("formatFeePercent", () => {
  it("formats basis points as percent", async () => {
    const { formatFeePercent } = await import("./circle-logic");
    expect(formatFeePercent(100)).toBe("1%");
    expect(formatFeePercent(150)).toBe("1.5%");
  });
});

describe("contribution status", () => {
  it("requires contributors paid, not recipient", () => {
    expect(allContributorsPaid(MEMBERS([false, true, false]), ORDER, 0)).toBe(false);
    expect(allContributorsPaid(MEMBERS([false, true, true]), ORDER, 0)).toBe(true);
  });

  it("lists unpaid contributors as defaulters", () => {
    const members = MEMBERS([false, false, true]);
    expect(activeDefaulters(members, ORDER, 0).map((m) => m.address)).toEqual([
      "GADDR1",
    ]);
  });

  it("recipient must not pay on their round", () => {
    expect(memberMustPayThisRound("GADDR0", ORDER, 0)).toBe(false);
    expect(memberMustPayThisRound("GADDR1", ORDER, 0)).toBe(true);
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

  it("allows recipient when period ended and contributors paid", () => {
    const members = MEMBERS([false, true, true]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(
      canRecipientClaimPayout("GADDR0", members, ORDER, 0, now - BigInt(1), "Active")
    ).toBe(true);
  });

  it("rejects before period ends", () => {
    const members = MEMBERS([false, true, true]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(
      canRecipientClaimPayout("GADDR0", members, ORDER, 0, now + BigInt(60), "Active")
    ).toBe(false);
  });

  it("resolves scheduled recipient", () => {
    expect(scheduledRecipient(ORDER, 1)).toBe("GADDR1");
  });

  it("allows anyone to trigger when contributors paid", () => {
    const members = MEMBERS([false, true, true]);
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(canTriggerPayout(members, ORDER, 0, now - BigInt(1), "Active")).toBe(true);
    expect(canRecipientClaimPayout("GADDR1", members, ORDER, 0, now - BigInt(1), "Active")).toBe(
      false
    );
  });
});

describe("contract-aligned helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses on-chain paid flag for round status", () => {
    const member = MEMBERS([false])[0];
    expect(memberHasPaidRound(member)).toBe(false);
    member.paid = true;
    expect(memberHasPaidRound(member)).toBe(true);
  });

  it("blocks voluntary exit after paying this round", () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    expect(canVoluntaryExit(true, now + BigInt(3600))).toBe(false);
    expect(canVoluntaryExit(false, now + BigInt(3600))).toBe(false);
    expect(canVoluntaryExit(false, now - BigInt(1))).toBe(true);
  });
});
