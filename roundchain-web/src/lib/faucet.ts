export async function requestFaucet(address: string): Promise<{
  ok: boolean;
  xlm?: { ok: boolean; error?: string };
  usdc?: { ok: boolean; hash?: string; error?: string };
  error?: string;
  retryAfterSec?: number;
}> {
  const res = await fetch("/api/faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  const data = await res.json();
  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? "Faucet request failed",
      retryAfterSec: data.retryAfterSec,
    };
  }
  return { ok: true, xlm: data.xlm, usdc: data.usdc };
}

export function formatRetryAfter(seconds: number): string {
  if (seconds <= 0) return "now";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.ceil(seconds / 60);
  return `${mins} min`;
}
