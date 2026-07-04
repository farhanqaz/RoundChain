export const CONTRACT_ERRORS: Record<number, string> = {
  1: "Circle not found",
  2: "Member not found",
  3: "Circle is full",
  4: "Circle is not open for new members",
  5: "Circle is not active",
  6: "Circle has not finished yet",
  7: "Only the circle admin can do this",
  8: "You are already a member",
  9: "Not enough members to start",
  10: "You already paid this round",
  11: "Member collateral was slashed",
  12: "Round period has not ended yet — please wait",
  13: "Cannot slash this member",
  14: "Member already slashed",
  15: "Collateral already claimed",
  16: "Invalid contribution amount",
  17: "Minimum 2 members required",
  18: "Invalid period duration",
  19: "Payout already received",
  20: "Trust score too low — complete circles to build reputation",
};

const TOKEN_ERRORS: Record<number, string> = {
  13: "USDC trustline not active — enable it in setup first",
};

function extractDiagnosticText(raw: unknown): string {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  if (text.includes("trustline entry is missing")) {
    return "USDC trustline not active — click Enable USDC on the setup page";
  }
  if (text.includes("insufficient balance") || text.includes("InsufficientBalance")) {
    return "Insufficient USDC balance — get testnet USDC from Circle faucet";
  }
  return text;
}

export function parseContractError(raw: unknown): string {
  const text = extractDiagnosticText(raw);

  const codeMatch = text.match(/Error\(Contract,\s*#(\d+)\)/);
  if (codeMatch) {
    const code = parseInt(codeMatch[1], 10);
    if (text.includes("trustline entry is missing")) {
      return TOKEN_ERRORS[code] ?? "USDC trustline not active";
    }
    return CONTRACT_ERRORS[code] ?? `Contract error #${code}`;
  }

  if (text.includes("CircleNotFound") || text.includes("not found")) {
    return "Circle not found — check the circle ID";
  }
  if (text.includes("User rejected") || text.includes("rejected")) {
    return "Transaction rejected in Freighter";
  }
  if (text.includes("Simulation failed")) {
    return "Simulation failed — check USDC trustline and balance";
  }

  if (text.length > 200) {
    return "Transaction failed — check Freighter and try again";
  }
  return text;
}
