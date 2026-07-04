import { NextRequest, NextResponse } from "next/server";
import { dripUsdc, dripXlm } from "@/lib/faucet-server";
import { ensureFaucetTrustline, hasUsdcTrustline } from "@/lib/usdc";

const COOLDOWN_MS = 5 * 60 * 1000;
const claims = new Map<string, number>();

export async function POST(req: NextRequest) {
  const faucetSecret = process.env.FAUCET_SECRET_KEY;
  if (!faucetSecret) {
    return NextResponse.json(
      { error: "Faucet not configured (FAUCET_SECRET_KEY)" },
      { status: 503 }
    );
  }

  let body: { address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const address = body.address?.trim();
  if (!address || !address.startsWith("G")) {
    return NextResponse.json({ error: "Stellar address (G...) required" }, { status: 400 });
  }

  const key = address.toLowerCase();
  const last = claims.get(key) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < COOLDOWN_MS) {
    return NextResponse.json(
      {
        error: "Rate limit — try again later",
        retryAfterSec: Math.ceil((COOLDOWN_MS - elapsed) / 1000),
      },
      { status: 429 }
    );
  }

  const xlm = await dripXlm(address);

  let usdc: { ok: boolean; hash?: string; error?: string } = { ok: false, error: "Skipped" };

  const receiverTrustline = await hasUsdcTrustline(address);
  if (!receiverTrustline) {
    usdc = { ok: false, error: "USDC trustline not active" };
  } else {
    try {
      await ensureFaucetTrustline(faucetSecret);
      usdc = await dripUsdc(faucetSecret, address);
    } catch (e) {
      usdc = {
        ok: false,
        error: e instanceof Error ? e.message : "Faucet setup failed",
      };
    }
  }

  if (!xlm.ok && !usdc.ok) {
    return NextResponse.json(
      {
        error: "XLM and USDC drip failed",
        xlm,
        usdc,
        hint: "Enable Circle USDC trustline or use faucet.circle.com",
      },
      { status: 500 }
    );
  }

  claims.set(key, Date.now());

  return NextResponse.json({
    ok: true,
    address,
    xlm,
    usdc,
  });
}
