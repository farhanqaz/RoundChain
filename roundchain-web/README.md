# RoundChain — Web Client

Production-facing interface for the RoundChain ROSCA protocol. Connects to Soroban via RPC, signs transactions through Freighter, and surfaces circle state, admin actions, and on-chain trust scores.

## Requirements

- Node.js 18+
- Freighter browser extension (testnet)
- Deployed contract ID (defaults provided in `.env.local.example`)

## Configuration

Copy the example environment file and adjust if you have redeployed the contract:

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

## Commands

```bash
npm install
npm run dev      # development server at localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

## Application Routes

| Path | Role |
|---|---|
| `/` | Product landing |
| `/demo` | Guided sandbox (short periods, minimal USDC) |
| `/create` | Circle creation with optional trust threshold |
| `/circles` | Index of on-chain circles |
| `/circle/[id]` | Member operations: contribute, claim payout |
| `/circle/[id]/admin` | Admin operations: start, slash |
| `/join/[id]` | Member enrollment via shared link |
| `/about` | Protocol overview and RPC health |

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
  lib/              Contract bindings, errors, faucet helpers
  providers/        Wallet and theme context
```
