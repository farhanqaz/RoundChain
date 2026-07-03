"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { FundWalletPanel } from "@/components/FundWalletPanel";
import { SetupUsdcTrustline } from "@/components/SetupUsdcTrustline";
import { ShareCircle } from "@/components/ShareCircle";
import { TxResult } from "@/components/TxResult";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { useWallet } from "@/providers/WalletProvider";
import { DEFAULT_CONTRIBUTION, DEFAULT_PERIOD, USDC_TOKEN } from "@/lib/constants";
import {
  buildCreateCircleOp,
  formatUsdc,
  getNextCircleId,
  getUsdcBalanceInfo,
  signWithFreighter,
  simulateAndSend,
} from "@/lib/contract";
import { checkWalletSetup, dripXlmOnly } from "@/lib/setup";
import { CopyButton } from "@/components/CopyButton";

export default function CreateCirclePage() {
  const router = useRouter();
  const { address } = useWallet();
  const [contribution, setContribution] = useState(String(DEFAULT_CONTRIBUTION / 10_000_000));
  const [periodDays, setPeriodDays] = useState(String(DEFAULT_PERIOD / 86400));
  const [maxMembers, setMaxMembers] = useState("5");
  const [minTrustScore, setMinTrustScore] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [trustline, setTrustline] = useState(false);
  const [usdcOk, setUsdcOk] = useState(false);

  const contributionAmount = BigInt(Math.floor(parseFloat(contribution || "0") * 10_000_000));
  const potEstimate = (parseFloat(contribution || "0") * parseInt(maxMembers || "0", 10)).toFixed(2);

  const refreshWallet = useCallback(async () => {
    if (!address) return;
    const status = await checkWalletSetup(
      address,
      contributionAmount > BigInt(0) ? contributionAmount : BigInt(1_000_000)
    );
    setTrustline(status.hasTrustline);
    setUsdcOk(status.ready);
  }, [address, contributionAmount]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    if (address) dripXlmOnly(address);
  }, [address]);

  const handleCreate = async () => {
    if (!address) return;
    const periodDuration = BigInt(parseInt(periodDays, 10) * 86400);
    const members = parseInt(maxMembers, 10);

    if (contributionAmount <= BigInt(0)) return setError("Iuran harus lebih dari 0");
    if (members < 2) return setError("Minimal 2 peserta");
    if (periodDuration < BigInt(86400)) return setError("Periode minimal 1 hari");

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const balance = await getUsdcBalanceInfo(address, USDC_TOKEN);
      if (balance.needsTrustline) return setError("Aktifkan trustline USDC dulu");
      if (balance.balance < contributionAmount) {
        return setError(`Saldo tidak cukup — minimal ${formatUsdc(contributionAmount)} USDC`);
      }

      const op = buildCreateCircleOp({
        admin: address,
        token: USDC_TOKEN,
        contributionAmount,
        periodDuration,
        maxMembers: members,
        minTrustScore: minTrustScore.trim()
          ? parseInt(minTrustScore, 10)
          : null,
      });

      const { hash, returnValue } = await simulateAndSend(address, signWithFreighter, op);
      setTxHash(hash);
      let id = returnValue != null ? Number(returnValue) : NaN;
      if (isNaN(id)) id = (await getNextCircleId()) - 1;
      setCreatedId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat arisan");
    } finally {
      setLoading(false);
    }
  };

  if (createdId != null) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          label="Berhasil"
          title={`Arisan #${createdId}`}
          description="Arisan siap. Join sebagai peserta lalu undang anggota."
        />
        <ShareCircle circleId={createdId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={`/join/${createdId}`} className="btn-primary text-center">
            Join sebagai peserta
          </Link>
          <button
            type="button"
            onClick={() => router.push(`/circle/${createdId}/admin`)}
            className="btn-secondary"
          >
            Panel pengelola
          </button>
        </div>
        {txHash && <TxResult hash={txHash} />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        backHref="/circles"
        backLabel="Daftar arisan"
        label="Pengelola"
        title="Buat arisan baru"
        description="Atur jumlah peserta, iuran, dan periode ronde."
      />

      {!address && (
        <ConnectWallet
          title="Dompet diperlukan"
          description="Hubungkan Freighter untuk membuat arisan."
        />
      )}

      {address && (
        <>
          {!trustline && (
            <div className="action-panel">
              <div className="action-panel-header">
                <p className="font-medium text-white">Trustline USDC</p>
                <p className="text-sm text-slate-400">Sekali saja — approve di Freighter.</p>
              </div>
              <div className="action-panel-body">
                <SetupUsdcTrustline address={address} onSuccess={refreshWallet} />
              </div>
            </div>
          )}

          {trustline && !usdcOk && (
            <div className="action-panel">
              <div className="action-panel-header">
                <p className="font-medium text-white">Isi saldo USDC</p>
              </div>
              <div className="action-panel-body">
                <FundWalletPanel
                  address={address}
                  minLabel={`Minimal ${formatUsdc(contributionAmount > BigInt(0) ? contributionAmount : BigInt(1_000_000))} USDC`}
                />
                <div className="flex gap-2 pt-2">
                  <CopyButton text={address} label="Salin alamat" />
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
            <div className="card space-y-6 p-6">
              <FormField label="Jumlah peserta" hint="Termasuk Anda sebagai pengelola">
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  className="input"
                />
              </FormField>

              <FormField label="Iuran per ronde (USDC)">
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                  className="input"
                />
              </FormField>

              <FormField label="Periode ronde (hari)" hint="Interval antar pembayaran iuran">
                <input
                  type="number"
                  min={1}
                  value={periodDays}
                  onChange={(e) => setPeriodDays(e.target.value)}
                  className="input"
                />
              </FormField>

              <FormField
                label="Min. trust score (opsional)"
                hint="Peserta baru harus punya reputasi on-chain minimal ini. Kosongkan = terbuka untuk semua. +10 poin per arisan selesai bersih."
              >
                <input
                  type="number"
                  min={0}
                  step={10}
                  placeholder="0 — terbuka"
                  value={minTrustScore}
                  onChange={(e) => setMinTrustScore(e.target.value)}
                  className="input"
                />
              </FormField>

              <button
                onClick={handleCreate}
                disabled={loading || !trustline}
                className="btn-primary w-full"
              >
                {loading ? "Memproses…" : "Buat arisan"}
              </button>
            </div>

            <aside className="card h-fit p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ringkasan</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Token</dt>
                  <dd className="text-right font-medium text-white">USDC testnet</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Peserta</dt>
                  <dd className="font-medium text-white">{maxMembers}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Pot / ronde</dt>
                  <dd className="font-semibold text-violet-300">≈ {potEstimate} USDC</dd>
                </div>
                {minTrustScore.trim() && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Min. trust</dt>
                    <dd className="font-medium text-amber-300">{minTrustScore} poin</dd>
                  </div>
                )}
              </dl>
            </aside>
          </div>
        </>
      )}

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
