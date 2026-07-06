import { describe, expect, it } from "vitest";
import { CONTRACT_ERRORS, parseContractError } from "./errors";

describe("parseContractError", () => {
  it("maps known contract error codes", () => {
    expect(parseContractError('Error(Contract, #20)')).toBe(CONTRACT_ERRORS[20]);
    expect(parseContractError('Error(Contract, #7)')).toBe(CONTRACT_ERRORS[7]);
  });

  it("handles trustline missing errors", () => {
    const raw = "trustline entry is missing Error(Contract, #13)";
    expect(parseContractError(raw)).toContain("trustline");
  });

  it("detects user rejection", () => {
    expect(parseContractError("User rejected the request")).toBe(
      "Transaction rejected in Freighter"
    );
  });

  it("detects simulation failures", () => {
    expect(parseContractError("Simulation failed: contract reverted")).toBe(
      "Simulation failed — check USDC trustline and balance"
    );
  });

  it("truncates very long unknown errors", () => {
    const long = "x".repeat(250);
    expect(parseContractError(long)).toBe(
      "Transaction failed — check Freighter and try again"
    );
  });
});
