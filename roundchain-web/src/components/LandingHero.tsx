"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconArrowRight, IconList, IconLock, IconShield } from "@/components/icons";

const FEATURES = [
  {
    icon: IconLock,
    title: "Dana terkunci otomatis",
    desc: "Collateral masuk kontrak saat join. Baru cair setelah arisan selesai — tidak ada celah untuk bendahara.",
  },
  {
    icon: IconShield,
    title: "Trust score on-chain",
    desc: "Selesaikan arisan bersih → +10 reputasi. Admin bisa set minimum score untuk pool lebih besar — credit history tanpa bank.",
  },
  {
    icon: IconList,
    title: "Giliran transparan",
    desc: "Urutan terima uang tercatat permanen. Setiap peserta bisa verifikasi kapan giliran mereka.",
  },
];

const STEPS = [
  { n: "01", title: "Buat arisan", desc: "Tentukan peserta, iuran, dan jadwal ronde." },
  { n: "02", title: "Undang peserta", desc: "Bagikan link — setiap orang join dan setor jaminan." },
  { n: "03", title: "Jalankan ronde", desc: "Bayar iuran berkala. Urutan terima uang diacak saat mulai." },
];

export function LandingHero() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  return (
    <div className="space-y-24 animate-fade-in">
      <section className="relative grid gap-14 pt-2 lg:grid-cols-2 lg:items-center lg:pt-6">
        <div className="space-y-7">
          <div className="pill-violet w-fit">Arisan on-chain · Stellar</div>
          <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem]">
            <span className="gradient-text">Kelola arisan</span>
            <br />
            <span className="text-white">dengan aturan yang jelas</span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-slate-400">
            RoundChain mengelola arisan digital dengan kontrak pintar — plus reputasi finansial
            on-chain untuk yang tidak punya credit score bank konvensional.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/create" className="btn-primary px-8 py-4 text-base">
              Buat arisan baru
              <IconArrowRight />
            </Link>
            <Link href="/circles" className="btn-secondary px-8 py-4 text-base">
              Lihat arisan aktif
            </Link>
          </div>
        </div>

        <div className="relative lg:pl-4">
          <div className="absolute -inset-6 rounded-3xl bg-violet-600/8 blur-3xl" />
          <div className="card relative overflow-hidden shadow-2xl shadow-black/50">
            <div className="border-b border-slate-800/60 bg-slate-950/50 px-5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Arisan #12</span>
                <span className="pill-emerald">Berjalan</span>
              </div>
            </div>
            <div className="p-5">
              <p className="stat-value">500.000 / ronde</p>
              <p className="text-xs text-slate-500">USDC · 5 peserta · periode 7 hari</p>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Progress</span>
                  <span>Ronde 2 dari 5</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400" />
                </div>
              </div>
              <ul className="mt-5 space-y-2">
                {[
                  { name: "Ani S.", sub: "Giliran aktif", highlight: true },
                  { name: "Budi R.", sub: "Iuran lunas", highlight: false },
                  { name: "Citra W.", sub: "Menunggu giliran", highlight: false },
                ].map((m) => (
                  <li
                    key={m.name}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-3 ${
                      m.highlight
                        ? "bg-violet-500/10 ring-1 ring-violet-500/20"
                        : "bg-slate-950/50"
                    }`}
                  >
                    <span className={`text-sm ${m.highlight ? "font-medium text-white" : "text-slate-400"}`}>
                      {m.name}
                    </span>
                    <span className={`text-xs ${m.highlight ? "text-emerald-400" : "text-slate-600"}`}>
                      {m.sub}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr,auto] lg:items-end">
          <div>
            <p className="section-label">Akses peserta</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Masuk ke arisan</h2>
            <p className="mt-1 text-sm text-slate-400">Masukkan ID arisan dari undangan pengelola</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const id = parseInt(joinId, 10);
              if (!id || id <= 0) {
                setJoinError("ID arisan tidak valid");
                return;
              }
              setJoinError(null);
              router.push(`/join/${id}`);
            }}
            className="flex flex-col gap-2 sm:flex-row lg:min-w-[360px]"
          >
            <input
              type="number"
              min="1"
              placeholder="ID arisan"
              value={joinId}
              onChange={(e) => {
                setJoinId(e.target.value);
                setJoinError(null);
              }}
              className="input flex-1"
            />
            <button type="submit" disabled={!joinId} className="btn-primary shrink-0 px-8">
              Masuk
            </button>
          </form>
        </div>
        {joinError && <p className="mt-3 text-sm text-red-400">{joinError}</p>}
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card-hover p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20">
              <Icon />
            </div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
          </div>
        ))}
      </section>

      <section className="space-y-8">
        <div>
          <p className="section-label">Alur kerja</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Dari setup hingga pencairan</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="card p-6">
              <span className="font-mono text-sm text-violet-400">{step.n}</span>
              <h3 className="mt-2 font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
