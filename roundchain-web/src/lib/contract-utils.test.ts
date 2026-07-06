import { describe, expect, it } from "vitest";
import {
  formatUsdc,
  normalizeCircle,
  normalizeMember,
  normalizeTrustScore,
  shortenAddress,
} from "./contract";

describe("normalizeCircle", () => {
  it("parses soroban-shaped circle state", () => {
    const circle = normalizeCircle({
      creator: "GCREATOR",
      token: "GTOKEN",
      contribution_amount: 10_000_000n,
      period_duration: 604800n,
      max_members: 5,
      member_count: 2,
      current_round: 1,
      total_rounds: 5,
      status: { tag: "Active", values: undefined },
      payout_order: ["GA", "GB"],
      next_payout_time: 1700000000n,
      min_trust_score: 20,
      created_at: 1699900000n,
      join_deadline: null,
    });

    expect(circle.creator).toBe("GCREATOR");
    expect(circle.admin).toBe("GCREATOR");
    expect(circle.contribution_amount).toBe(BigInt(10_000_000));
    expect(circle.status).toBe("Active");
    expect(circle.created_at).toBe(BigInt(1699900000));
  });

  it("handles void min_trust_score", () => {
    const circle = normalizeCircle({
      creator: "GCREATOR",
      token: "GTOKEN",
      contribution_amount: 1,
      period_duration: 1,
      max_members: 2,
      member_count: 0,
      current_round: 0,
      total_rounds: 2,
      status: "Pending",
      payout_order: [],
      next_payout_time: 0,
      min_trust_score: null,
      created_at: 0,
      join_deadline: null,
    });
    expect(circle.min_trust_score).toBeNull();
  });
});

describe("normalizeTrustScore", () => {
  it("parses trust score record", () => {
    const trust = normalizeTrustScore({
      address: "GUSER",
      circles_completed: 2,
      circles_defaulted: 1,
      score: 0,
    });
    expect(trust.address).toBe("GUSER");
    expect(trust.circles_completed).toBe(2);
    expect(trust.score).toBe(0);
  });
});

describe("normalizeMember", () => {
  it("parses member flags and amounts", () => {
    const member = normalizeMember({
      address: "GMEMBER",
      collateral_deposited: 50_000_000,
      contributions_paid: 3,
      has_received_payout: true,
      is_slashed: false,
      collateral_claimed: false,
    });
    expect(member.collateral_deposited).toBe(BigInt(50_000_000));
    expect(member.has_received_payout).toBe(true);
  });
});

describe("formatUsdc", () => {
  it("formats 7-decimal USDC amounts", () => {
    expect(formatUsdc(BigInt(10_000_000))).toBe("1.0");
    expect(formatUsdc(BigInt(1_500_000))).toBe("0.15");
    expect(formatUsdc(BigInt(0))).toBe("0.0");
  });
});

describe("shortenAddress", () => {
  it("shortens long stellar addresses", () => {
    const addr = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    expect(shortenAddress(addr)).toBe("GAAA…AWHF");
  });

  it("returns short addresses unchanged", () => {
    expect(shortenAddress("GABC")).toBe("GABC");
  });
});
