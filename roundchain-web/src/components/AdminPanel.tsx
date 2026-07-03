"use client";

import { useState } from "react";
import Link from "next/link";
import { ShareCircle } from "@/components/ShareCircle";
import { TxResult } from "@/components/TxResult";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import {
  activeDefaulters,
  isPeriodEnded,
  recipientIsDefaulter,
  scheduledRecipient,
  timeRemaining,
} from "@/lib/circle-logic";
import {
  buildSlashDefaulterOp,
  buildStartCircleOp,
  MemberDetail,
  shortenAddress,
  signWithFreighter,
  simulateAndSend,
} from "@/lib/contract";

interface Props {
  circleId: number;
  address: string;
  isAdmin: boolean;
  status: string;
  members: MemberDetail[];
  memberCount: number;
  maxMembers: number;
  currentRound: number;
  payoutOrder: string[];
  nextPayoutTime: bigint;
  adminInCircle: boolean;
  onSuccess: () => void;
}

export function AdminPanel({
  circleId,
  address,
  isAdmin,
  status,
  members,
  memberCount,
  maxMembers,
  currentRound,
  payoutOrder,
  nextPayoutTime,
  adminInCircle,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <Alert variant="warning" title="Hanya pengelola arisan">
        Hubungkan dompet yang dipakai saat membuat arisan.{" "}
        <Link href={`/circle/${circleId}`} className="text-violet-400 underline">
          Kembali
        </Link>
      </Alert>
    );
  }

  const run = async (action: string, buildOp: () => ReturnType<typeof buildStartCircleOp>) => {
    setLoading(action);
    setError(null);
    setTxHash(null);
    try {
      const { hash } = await simulateAndSend(address, signWithFreighter, buildOp());
      setTxHash(hash);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaksi gagal");
    } finally {
      setLoading(null);
    }
  };

  const defaulters = activeDefaulters(members);
  const periodEnded = isPeriodEnded(nextPayoutTime);
  const recipient = scheduledRecipient(payoutOrder, currentRound);
  const recipientDefaulted = recipientIsDefaulter(members, payoutOrder, currentRound);

  const canStart = status === "Pending" && memberCount >= maxMembers;
  const canSlash = status === "Active" && periodEnded && defaulters.length > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        backHref={`/circle/${circleId}`}
        backLabel="Arisan"
        label="Pengelola"
        title={`Arisan #${circleId}`}
        badge={<StatusBadge status={status} />}
      />

      {status === "Pending" && !adminInCircle && (
        <Alert variant="warning" title="Anda juga harus join">
          Pengelola tidak otomatis jadi peserta.{" "}
          <Link href={`/join/${circleId}`} className="underline">
            Join arisan ini
          </Link>{" "}
          dulu — Anda dihitung sebagai 1 dari {maxMembers} peserta.
        </Alert>
      )}

      {status === "Active" && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Ronde {currentRound + 1}</p>
            <p className="font-medium text-white">{timeRemaining(nextPayoutTime)}</p>
          </div>
          {recipient && (
            <p className="text-sm text-slate-400">
              Penerima giliran:{" "}
              <span className="font-mono text-violet-300">{shortenAddress(recipient, 6)}</span>
            </p>
          )}
        </div>
      )}

      {status === "Pending" && <ShareCircle circleId={circleId} />}

      <div className="action-panel">
        <div className="action-panel-header">
          <p className="font-medium text-white">Tindakan pengelola</p>
          <p className="text-xs text-slate-500">Mulai arisan dan enforce keterlambatan</p>
        </div>
        <div className="action-panel-body space-y-4">
        {status === "Pending" && (
          <>
            <Step
              done={memberCount >= maxMembers}
              label={`Peserta lengkap (${memberCount}/${maxMembers})`}
              hint="Bagikan link join — semua peserta termasuk Anda harus join"
            />
            <button
              disabled={!!loading || !canStart}
              onClick={() => run("Start", () => buildStartCircleOp(circleId))}
              className="btn-primary w-full"
            >
              {loading === "Start" ? "Memulai…" : "Mulai arisan"}
            </button>
            {!canStart && (
              <p className="text-xs text-slate-500">Tunggu semua slot terisi dulu.</p>
            )}
            {canStart && (
              <p className="text-xs text-slate-500">
                Urutan giliran terima uang akan diacak on-chain saat Anda mulai arisan.
              </p>
            )}
          </>
        )}

        {status === "Active" && (
          <>
            <Step
              done={periodEnded && !recipientDefaulted && defaulters.length === 0}
              label="Peserta giliran claim sendiri"
              hint={
                periodEnded
                  ? recipient
                    ? `${shortenAddress(recipient, 6)} terima uang di halaman arisan`
                    : "Penerima giliran klik terima uang sendiri"
                  : timeRemaining(nextPayoutTime)
              }
            />

            {defaulters.length > 0 && periodEnded && (
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <p className="text-xs font-medium text-red-300">Potong collateral yang telat bayar</p>
                {defaulters.map((d) => (
                  <button
                    key={d.address}
                    disabled={!!loading || !canSlash}
                    onClick={() => run("Slash", () => buildSlashDefaulterOp(circleId, d.address))}
                    className="btn-danger w-full text-sm"
                  >
                    Potong {shortenAddress(d.address)}
                  </button>
                ))}
              </div>
            )}

            {recipientDefaulted && periodEnded && (
              <Alert variant="error">
                Penerima giliran belum bayar — potong collateral dulu, lalu giliran berikutnya bisa claim.
              </Alert>
            )}

            {periodEnded && defaulters.length === 0 && !recipientDefaulted && recipient && (
              <Alert variant="info">
                Giliran terima uang: <span className="font-mono">{shortenAddress(recipient, 6)}</span> — mereka
                claim sendiri di halaman arisan, bukan dari sini.
              </Alert>
            )}
            {!periodEnded && (
              <p className="text-xs text-slate-500">
                Setelah waktu ronde habis, peserta yang giliran klik &quot;Terima uang arisan&quot; sendiri.
              </p>
            )}
          </>
        )}

        {status === "Completed" && (
          <Alert variant="success">Arisan selesai. Peserta bisa ambil collateral di halaman arisan.</Alert>
        )}

        {error && <Alert variant="error">{error}</Alert>}
        {txHash && <TxResult hash={txHash} />}
        </div>
      </div>
    </div>
  );
}

function Step({ done, label, hint }: { done: boolean; label: string; hint: string }) {
  return (
    <div className="flex gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
          done ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-500"
        }`}
      >
        {done ? "✓" : "·"}
      </span>
      <div>
        <p className={`text-sm ${done ? "text-slate-400 line-through" : "text-white"}`}>{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}
