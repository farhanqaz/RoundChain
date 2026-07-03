import { getClassicUsdcBalance, hasUsdcTrustline, USDC_ISSUER } from "./usdc";

export interface WalletSetupStatus {
  hasTrustline: boolean;
  usdcBalance: bigint;
  ready: boolean;
  minUsdc: bigint;
  issuer: string;
}

export async function checkWalletSetup(
  address: string,
  minUsdc: bigint,
  issuer: string = USDC_ISSUER
): Promise<WalletSetupStatus> {
  const hasTrustline = await hasUsdcTrustline(address, issuer);
  const usdcBalance = hasTrustline
    ? await getClassicUsdcBalance(address, issuer)
    : BigInt(0);
  return {
    hasTrustline,
    usdcBalance,
    ready: hasTrustline && usdcBalance >= minUsdc,
    minUsdc,
    issuer,
  };
}

export async function dripXlmOnly(address: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`
    );
    return res.ok || (await res.text()).includes("already funded");
  } catch {
    return false;
  }
}

export const CIRCLE_FAUCET_LINK = "https://faucet.circle.com/";

export function whatsAppShare(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function joinInviteMessage(circleId: number, origin: string): string {
  return `Yuk join arisan RoundChain #${circleId} 🎉\nTinggal buka link, connect dompet, terus Join:\n${origin}/join/${circleId}`;
}
