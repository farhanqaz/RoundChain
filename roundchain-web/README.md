# RoundChain Web

Next.js frontend for the RoundChain ROSCA protocol on Stellar testnet.

## Setup

```bash
npm install
cp .env.local.example .env.local   # edit CONTRACT_ID if redeployed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with **Freighter on testnet**.

## Environment

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed Soroban contract |
| `NEXT_PUBLIC_USDC_TOKEN` | Circle testnet USDC SAC |
| `NEXT_PUBLIC_SOROBAN_RPC` | Soroban RPC URL |
| `FAUCET_SECRET_KEY` | Server-only faucet wallet (optional) |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/demo` | Sandbox wizard |
| `/circles` | Browse all circles |
| `/create` | Create new arisan |
| `/circle/[id]` | Dashboard, contribute, claim payout |
| `/circle/[id]/admin` | Start circle, slash defaulters |

## Freighter testnet checklist

1. Switch Freighter to **Testnet**
2. Fund XLM via friendbot
3. Add USDC trustline (Circle issuer)
4. Get testnet USDC from [faucet.circle.com](https://faucet.circle.com/) (Stellar Testnet)

## Demo flow

1. Admin creates circle at `/create` → note circle ID
2. Members join at `/join/[id]` (deposit collateral)
3. Admin starts circle at `/circle/[id]/admin`
4. Each round: members contribute → recipient claims payout on their turn
5. After all rounds: members claim collateral back
