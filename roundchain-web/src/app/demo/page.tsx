"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SetupUsdcTrustline } from "@/components/SetupUsdcTrustline";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { useWallet } from "@/providers/WalletProvider";
import { DEMO_CONTRIBUTION } from "@/lib/constants";
import {
  buildCreateCircleOp,
  formatUsdc,
  getNextCircleId,
  signWithFreighter,
  simulateAndSend,
} from "@/lib/contract";
import {
  CIRCLE_FAUCET_LINK,
  checkWalletSetup,
  dripXlmOnly,
  joinInviteMessage,
  whatsAppShare,
} from "@/lib/setup";
import { USDC_ISSUER, USDC_SAC } from "@/lib/usdc-assets";
import { CopyButton } from "@/components/CopyButton";

const STEPS = ["Dompet", "USDC", "Saldo", "Arisan"];

export default function DemoPage() {
  const router = useRouter();
  const { address, connect } = useWallet();
  const [xlmDone, setXlmDone] = useState(false);
  const [trustline, setTrustline] = useState(false);
  const [usdcOk, setUsdcOk] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [circleId, setCircleId] = useState<number | null>(null);

  const minUsdc = BigInt(DEMO_CONTRIBUTION);
  const stepIndex = !address ? 0 : !trustline ? 1 : !usdcOk ? 2 : circleId ? 4 : 3;

  const refresh = useCallback(async () => {
    if (!address) return;
    const status = await checkWalletSetup(address, minUsdc);
    setTrustline(status.hasTrustline);
    setUsdcBalance(status.usdcBalance);
    setUsdcOk(status.ready);
  }, [address, minUsdc]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (address && !xlmDone) dripXlmOnly(address).then(() => setXlmDone(true));
  }, [address, xlmDone]);

  const handleCreate = async () => {
    if (!address) return;
    setCreating(true);
    setError(null);
    try {
      const op = buildCreateCircleOp({
        admin: address,
        token: USDC_SAC,
        contributionAmount: minUsdc,
        periodDuration: BigInt(60),
        maxMembers: 2,
      });
      const { returnValue } = await simulateAndSend(address, signWithFreighter, op);
      let id = returnValue != null ? Number(returnValue) : NaN;
      if (isNaN(id)) id = (await getNextCircleId()) - 1;
      setCircleId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat arisan latihan");
    } finally {
      setCreating(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        backHref="/"
        backLabel="Beranda"
        label="Sandbox"
        title="Latihan arisan"
        description="Environment latihan dengan preset singkat: 2 peserta, 1 menit per ronde, 0,1 USDC. Untuk arisan produksi, gunakan Buat Arisan."
        action={
          <Link href="/create" className="btn-ghost text-sm">
            Buat arisan →
          </Link>
        }
      />

      <div className="flex gap-2">
        {STEPS.map((name, i) => (
          <div key={name} className="flex-1">
            <div
              className={`h-1 rounded-full transition ${i <= stepIndex ? "bg-violet-500" : "bg-slate-800"}`}
            />
            <p className={`mt-1.5 text-center text-[10px] uppercase tracking-wide ${i <= stepIndex ? "text-violet-400" : "text-slate-600"}`}>
              {name}
            </p>
          </div>
        ))}
      </div>

      <div className="action-panel">
        <StepRow done={!!address} active={stepIndex === 0} title="Hubungkan dompet">
          {!address ? (
            <button type="button" onClick={connect} className="btn-primary w-full">
              Hubungkan Freighter
            </button>
          ) : (
            <p className="text-sm text-emerald-400">
              Terhubung{xlmDone && " · biaya transaksi disiapkan"}
            </p>
          )}
        </StepRow>

        <StepRow done={trustline} active={stepIndex === 1} title="Aktifkan USDC">
          {address && !trustline && (
            <SetupUsdcTrustline address={address} issuer={USDC_ISSUER} onSuccess={refresh} />
          )}
          {trustline && <p className="text-sm text-emerald-400">USDC aktif</p>}
        </StepRow>

        <StepRow done={usdcOk} active={stepIndex === 2} title="Isi saldo">
          <p className="text-sm text-slate-400">
            Ambil USDC testnet dari Circle Faucet (network: Stellar Testnet).
          </p>
          {address && (
            <div className="mt-3 space-y-2">
              <code className="block truncate rounded-xl bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-400">
                {address}
              </code>
              <div className="flex gap-2">
                <CopyButton text={address} label="Salin" />
                <a href={CIRCLE_FAUCET_LINK} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 py-2 text-center text-xs">
                  Buka faucet
                </a>
              </div>
              {trustline && (
                <p className="text-xs text-slate-500">
                  Saldo: {formatUsdc(usdcBalance)} USDC
                  {!usdcOk && ` · min. ${formatUsdc(minUsdc)}`}
                </p>
              )}
            </div>
          )}
        </StepRow>

        <StepRow done={!!circleId} active={stepIndex === 3} title="Buat arisan latihan" last>
          {!circleId ? (
            <>
              <p className="text-sm text-slate-400">Preset: 2 peserta · 60 detik · 0,1 USDC</p>
              <button
                onClick={handleCreate}
                disabled={creating || stepIndex !== 3}
                className="btn-primary mt-3 w-full"
              >
                {creating ? "Memproses…" : "Buat arisan latihan"}
              </button>
            </>
          ) : (
            <SuccessPanel circleId={circleId} origin={origin} router={router} />
          )}
        </StepRow>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}

function SuccessPanel({
  circleId,
  origin,
  router,
}: {
  circleId: number;
  origin: string;
  router: ReturnType<typeof useRouter>;
}) {
  const joinUrl = `${origin}/join/${circleId}`;
  const waLink = whatsAppShare(joinInviteMessage(circleId, origin));

  return (
    <div className="space-y-4">
      <Alert variant="success" title={`Arisan #${circleId} siap`}>
        Join sebagai peserta, undang 1 orang lagi, lalu mulai dari panel pengelola.
      </Alert>
      <div className="flex gap-2">
        <CopyButton text={joinUrl} label="Salin undangan" />
        <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-success flex-1 py-2 text-center text-xs">
          WhatsApp
        </a>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link href={`/join/${circleId}`} className="btn-primary text-center text-sm">
          Join sekarang
        </Link>
        <button type="button" onClick={() => router.push(`/circle/${circleId}/admin`)} className="btn-secondary text-sm">
          Panel pengelola
        </button>
      </div>
    </div>
  );
}

function StepRow({
  done,
  active,
  title,
  last,
  children,
}: {
  done: boolean;
  active: boolean;
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`px-5 py-5 ${!last ? "border-b border-slate-800/60" : ""} ${active ? "bg-violet-950/20" : ""}`}>
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
            done ? "bg-emerald-600/90 text-white" : active ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-500"
          }`}
        >
          {done ? "✓" : "·"}
        </span>
        <p className={`text-sm font-medium ${done ? "text-slate-500" : "text-white"}`}>{title}</p>
      </div>
      {!done && <div className="pl-10">{children}</div>}
    </div>
  );
}
