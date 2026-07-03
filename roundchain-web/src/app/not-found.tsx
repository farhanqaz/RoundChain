import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="section-label">404</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Halaman tidak ditemukan</h1>
      <p className="mt-3 max-w-md text-slate-400">
        Arisan atau halaman yang Anda cari tidak ada. Periksa nomor arisan atau kembali ke
        beranda.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-primary px-6">
          Beranda
        </Link>
        <Link href="/circles" className="btn-secondary px-6">
          Daftar arisan
        </Link>
      </div>
    </div>
  );
}
