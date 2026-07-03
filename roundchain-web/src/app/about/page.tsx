"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { IconLock, IconList, IconShield } from "@/components/icons";
import {
  CONTRACT_ID,
  EXPLORER_CONTRACT_URL,
  SOROBAN_RPC,
  USDC_TOKEN,
} from "@/lib/constants";
import { server } from "@/lib/contract";

const VALUES = [
  { icon: IconLock, title: "Tanpa perantara", desc: "Dana tidak lewat bendahara manusia." },
  { icon: IconList, title: "Aturan transparan", desc: "Semua aturan tercatat di blockchain." },
  { icon: IconShield, title: "Denda otomatis", desc: "Sistem enforce, bukan drama grup WA." },
];

export default function AboutPage() {
  const [rpcOk, setRpcOk] = useState<boolean | null>(null);
  const [showDev, setShowDev] = useState(false);

  useEffect(() => {
    server.getHealth().then(() => setRpcOk(true)).catch(() => setRpcOk(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-12">
      <div>
        <p className="section-label">Tentang</p>
        <h1 className="mt-2 text-3xl font-bold text-white">RoundChain</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-400">
          Platform arisan digital yang menggantikan kepercayaan buta dengan kontrak pintar di
          Stellar Soroban. Collateral terkunci, urutan giliran transparan, dan denda otomatis untuk
          peserta yang telat bayar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {VALUES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card p-4">
            <Icon className="mb-2 h-5 w-5 text-violet-400" />
            <p className="font-medium text-white">{title}</p>
            <p className="mt-1 text-xs text-slate-500">{desc}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <p className="text-sm text-slate-500">Status jaringan</p>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${rpcOk === true ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : rpcOk === false ? "bg-red-400" : "bg-slate-500"}`}
          />
          <span className="text-sm text-slate-300">
            Soroban Testnet {rpcOk === true ? "online" : rpcOk === false ? "offline" : "memeriksa…"}
          </span>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-white">Mulai dari sini</h2>
        <ol className="mt-4 space-y-3 text-sm text-slate-400">
          <li className="flex gap-3">
            <span className="font-mono text-violet-400">1</span>
            <span>
              <Link href="/demo" className="text-violet-300 hover:underline">
                Coba demo
              </Link>{" "}
              atau{" "}
              <Link href="/create" className="text-violet-300 hover:underline">
                buat arisan
              </Link>{" "}
              dengan aturan sendiri
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-violet-400">2</span>
            <span>Undang peserta lewat link atau WhatsApp</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-violet-400">3</span>
            <span>Mulai arisan → bayar iuran → yang giliran terima uang sendiri</span>
          </li>
        </ol>
      </div>

      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDev(!showDev)}
          className="flex w-full items-center justify-between px-6 py-4 text-left text-sm text-slate-400 hover:bg-slate-900/40"
        >
          <span>Informasi teknis (developer)</span>
          <span className="text-slate-600">{showDev ? "−" : "+"}</span>
        </button>
        {showDev && (
          <div className="space-y-4 border-t border-slate-800 px-6 py-5">
            {[
              { label: "RoundChain contract", value: CONTRACT_ID },
              { label: "USDC (Circle testnet)", value: USDC_TOKEN },
              { label: "Soroban RPC", value: SOROBAN_RPC },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-slate-600">{item.label}</p>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 truncate rounded-lg bg-slate-950 px-3 py-2 font-mono text-xs text-slate-400">
                    {item.value || "—"}
                  </code>
                  {item.value && (
                    <div className="flex gap-2">
                      <CopyButton text={item.value} />
                      {item.label !== "Soroban RPC" && (
                        <a
                          href={`${EXPLORER_CONTRACT_URL}/${item.value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost py-2 text-xs"
                        >
                          Explorer
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
