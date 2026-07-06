# RoundChain — Web Client

Production-facing interface for the RoundChain ROSCA protocol. Connects to Soroban via RPC, signs transactions through Freighter, and surfaces circle state, member actions, and on-chain trust scores.

## Requirements

- Node.js 18+
- Freighter browser extension (testnet)
- Deployed contract ID (see `.env.local.example`)

## Configuration

```bash
cp .env.local.example .env.local
```

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CONTRACT_ID` | Client | Soroban contract address |
| `NEXT_PUBLIC_USDC_TOKEN` | Client | Circle testnet USDC SAC |
| `NEXT_PUBLIC_SOROBAN_RPC` | Client | Soroban RPC endpoint |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Client | Stellar network identifier |
| `NEXT_PUBLIC_EXPLORER_TX_URL` | Client | Transaction explorer base URL |
| `FAUCET_SECRET_KEY` | Server | Optional faucet signer for `/api/faucet` |

**Current testnet contract:** `CDYUIAZD2RCFRX7FYVKGPE2ED4H4ZUNGHMSGEOVKA42OAK3CBBVE55KO`

Restart `npm run dev` after changing `.env.local`.

## Commands

```bash
npm install
npm run dev      # development server at localhost:3000
npm test         # 40 unit tests (Vitest)
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

## Application Routes

| Path | Role |
|---|---|
| `/` | Product landing |
| `/demo` | Guided sandbox (60s periods, minimal USDC) |
| `/create` | Circle creation with trust threshold and join window |
| `/circles` | Index of on-chain circles |
| `/circle/[id]` | Member dashboard: contribute, payout, exit, slash |
| `/join/[id]` | Enrollment via shared link |
| `/about` | Protocol overview, RPC health, contract addresses |

Circles auto-start when the last member joins. Invite link is hidden when the circle is full or join window closed.

## UX Highlights

- **Recipient turn** — no Pay button; shows “waiting for contributors”
- **Pot display** — net amount after on-chain fee (`get_fee_config`)
- **Flow visualization** — round progress, contributor status, payout order
- **Trust badge** — live score in header when wallet connected

## Wallet Setup (Testnet)

1. Enable testnet in Freighter
2. Fund the account with XLM (friendbot)
3. Add trustline to Circle USDC issuer
4. Obtain test USDC from [faucet.circle.com](https://faucet.circle.com/)

## Project Layout

```
src/
  app/              Next.js App Router pages
  components/       UI, circle dashboard, wallet connect
  hooks/            useCircle, useFeeConfig
  lib/              Contract bindings, circle logic, errors
  providers/        Wallet and theme context
```
