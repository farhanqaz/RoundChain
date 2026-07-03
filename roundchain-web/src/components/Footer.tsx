import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/40">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm space-y-2">
          <p className="font-medium text-white">RoundChain</p>
          <p className="text-sm leading-relaxed text-slate-500">
            Arisan digital dengan jaminan kontrak pintar di Stellar. Aman, transparan, tanpa
            perantara yang bisa lari.
          </p>
        </div>
        <div className="flex gap-12 text-sm">
          <div className="space-y-2">
            <p className="font-medium text-slate-300">Produk</p>
            <Link href="/demo" className="block text-slate-500 hover:text-white">
              Coba demo
            </Link>
            <Link href="/create" className="block text-slate-500 hover:text-white">
              Buat arisan
            </Link>
            <Link href="/circles" className="block text-slate-500 hover:text-white">
              Daftar arisan
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-slate-300">Info</p>
            <Link href="/about" className="block text-slate-500 hover:text-white">
              Tentang
            </Link>
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-slate-500 hover:text-white"
            >
              Stellar Network
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-600">
        Stellar Testnet · Soroban Smart Contract · © {new Date().getFullYear()} RoundChain
      </div>
    </footer>
  );
}
