# RoundChain

Trustless arisan (ROSCA) on Stellar/Soroban — collateral on-chain, urutan giliran acak, denda otomatis, **trust score on-chain**.

**Hackathon**: APAC Stellar Hackathon — Rise In × Stellar Development Foundation  
**Track**: Local Finance & Real World Access

## Live Testnet

| Resource | Value |
|----------|-------|
| Contract ID | `CCDF2YTXH5B7ULUDQIM4LU4H633LQEFW3R75HWK76YFWMGJV2J6YSA7Y` |
| Explorer | [Stellar.Expert](https://stellar.expert/explorer/testnet/contract/CCDF2YTXH5B7ULUDQIM4LU4H633LQEFW3R75HWK76YFWMGJV2J6YSA7Y) |
| USDC (Circle testnet SAC) | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |

## Structure

```
roundchain-contract/   Soroban smart contract (Rust)
roundchain-web/        Next.js 14 + Freighter
```

## Quick Start

### Contract

```bash
cd roundchain-contract
cargo test
./scripts/deploy.sh
```

### Frontend

```bash
cd roundchain-web
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with **Freighter on testnet**.

### Testnet setup

1. Freighter → **Testnet**
2. Trustline USDC Circle → [faucet.circle.com](https://faucet.circle.com/) (Stellar Testnet)
3. Optional: set `FAUCET_SECRET_KEY` in `.env.local` for API drip (XLM + USDC)

## Contract API

| Function | Who | Description |
|----------|-----|-------------|
| `create_circle` | Admin | Buat arisan baru (opsional `min_trust_score`) |
| `join_circle` | Member | Join + deposit collateral (cek trust score) |
| `start_circle` | Admin | Mulai (acak urutan giliran) |
| `contribute` | Member | Bayar iuran ronde |
| `trigger_payout` | Anyone | Cairkan pot ke penerima giliran |
| `slash_defaulter` | Anyone | Potong collateral telat bayar |
| `claim_collateral` | Member | Ambil jaminan setelah selesai |

Views: `get_circle`, `get_member`, `get_contribution_status`, `get_next_circle_id`, `get_trust_score`

## Trust score

Setiap alamat punya reputasi on-chain:

- **+10** per arisan selesai bersih (tanpa default/slash)
- **−25** per arisan dengan default
- Admin bisa set `min_trust_score` saat `create_circle` — `join_circle` reject jika score kurang

Credit history primitive untuk unbanked: selesaikan 3 arisan → score 30 → bisa join pool lebih besar.

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/demo` | Sandbox (60s, 0.1 USDC) |
| `/create` | Buat arisan |
| `/circles` | Daftar arisan |
| `/circle/[id]` | Dashboard — bayar iuran, claim payout |
| `/circle/[id]/admin` | Pengelola — mulai, slash |
| `/join/[id]` | Link undangan |
| `/about` | Tentang + info teknis |

## Flow

1. Pengelola buat arisan di `/create`
2. Peserta join via `/join/[id]` (deposit collateral)
3. Pengelola **Mulai arisan** → urutan giliran diacak on-chain
4. Setiap ronde: semua bayar iuran → penerima giliran claim payout sendiri
5. Selesai: peserta claim collateral kembali

## Stack

- Soroban SDK 26, Rust
- Next.js 14, TypeScript, Tailwind
- Freighter wallet

## License

MIT
