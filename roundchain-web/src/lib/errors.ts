export const CONTRACT_ERRORS: Record<number, string> = {
  1: "Arisan tidak ditemukan",
  2: "Peserta tidak ditemukan",
  3: "Arisan sudah penuh",
  4: "Arisan belum siap dimulai",
  5: "Arisan tidak aktif",
  6: "Arisan belum selesai",
  7: "Hanya pengelola yang bisa melakukan ini",
  8: "Anda sudah jadi peserta",
  9: "Peserta belum cukup untuk mulai",
  10: "Sudah bayar iuran ronde ini",
  11: "Peserta sudah dipotong collateral-nya",
  12: "Waktu ronde belum selesai — tunggu dulu",
  13: "Tidak bisa memotong peserta ini",
  14: "Peserta sudah dipotong",
  15: "Collateral sudah diambil",
  16: "Nominal iuran tidak valid",
  17: "Minimal 2 peserta",
  18: "Durasi periode tidak valid",
  19: "Sudah terima uang arisan",
  20: "Trust score terlalu rendah — selesaikan arisan dulu untuk naik reputasi",
};

const TOKEN_ERRORS: Record<number, string> = {
  13: "Trustline USDC belum aktif — aktifkan dulu di panduan setup",
};

function extractDiagnosticText(raw: unknown): string {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  if (text.includes("trustline entry is missing")) {
    return "Trustline USDC belum aktif — klik Aktifkan USDC di halaman setup";
  }
  if (text.includes("insufficient balance") || text.includes("InsufficientBalance")) {
    return "Saldo USDC tidak cukup — ambil dari faucet Circle (Stellar Testnet)";
  }
  return text;
}

export function parseContractError(raw: unknown): string {
  const text = extractDiagnosticText(raw);

  const codeMatch = text.match(/Error\(Contract,\s*#(\d+)\)/);
  if (codeMatch) {
    const code = parseInt(codeMatch[1], 10);
    if (text.includes("trustline entry is missing")) {
      return TOKEN_ERRORS[code] ?? "Trustline USDC belum aktif";
    }
    return CONTRACT_ERRORS[code] ?? `Error kontrak #${code}`;
  }

  if (text.includes("CircleNotFound") || text.includes("not found")) {
    return "Arisan tidak ditemukan — periksa nomor arisan";
  }
  if (text.includes("User rejected") || text.includes("rejected")) {
    return "Transaksi ditolak di Freighter";
  }
  if (text.includes("Simulation failed")) {
    return "Simulasi gagal — periksa trustline USDC dan saldo";
  }

  if (text.length > 200) {
    return "Transaksi gagal — periksa Freighter dan coba lagi";
  }
  return text;
}
