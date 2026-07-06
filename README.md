# RoundChain

**On-chain rotating savings circles with portable financial reputation.**

RoundChain is a Soroban smart contract and web interface that brings ROSCA (rotating savings and credit association) mechanics — commonly known as *arisan* across Southeast Asia — onto Stellar. Collateral, payout order, contributions, and member reputation are enforced by contract logic rather than social trust alone.

Built for the **APAC Stellar Hackathon** (Rise In × Stellar Development Foundation) · **Local Finance & Real World Access** track.

---

## Problem

Hundreds of millions of people in APAC participate in informal savings circles. These systems work because of community accountability, but they break down when:

- A member defaults and there is no enforceable recourse
- Payout order is disputed or manipulated
- Participants have no verifiable credit history to join larger pools
- Organizers must manually track contributions across rounds

RoundChain addresses each failure mode with deterministic on-chain rules and a composable trust score primitive.

## Solution

RoundChain implements a full ROSCA lifecycle on Soroban:

| Capability | Implementation |
|---|---|
| **Collateral escrow** | USDC locked at join; released only after circle completion |
| **Fair payout order** | Fisher–Yates shuffle via Soroban PRNG at `start_circle` |
| **Round enforcement** | Per-member contribution tracking with permissionless slashing |
| **Financial reputation** | Persistent trust score updated on completion; gates entry to high-value circles |

The result is a savings protocol that preserves the social model of arisan while adding cryptographic guarantees suitable for underbanked users who lack traditional credit scores.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     roundchain-web                          │
│  Next.js 14 · Freighter · Stellar SDK · Tailwind            │
└──────────────────────────┬──────────────────────────────────┘
                           │ Soroban RPC (testnet)
┌──────────────────────────▼──────────────────────────────────┐
│              RoundChain Soroban Contract                    │
│                                                             │
│  create_circle ──► join_circle ──► start_circle               │
│       │                │               │                    │
│       │         [collateral in]  [shuffle payout order]     │
│       │                │               │                    │
│       └──── contribute ◄──► trigger_payout (per round)      │
│                    │                                        │
│              slash_defaulter (permissionless)               │
│                    │                                        │
│         claim_collateral + trust score update               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    Circle USDC (SAC)
```

### Circle lifecycle

1. **Configure** — Admin sets contribution amount, period duration, member cap, and optional minimum trust score.
2. **Enroll** — Members join via invite link; collateral is transferred into the contract. Join is rejected if trust score is below the threshold.
3. **Activate** — Admin starts the circle; payout order is randomized and recorded immutably on-chain.
4. **Operate** — Each round, members contribute USDC. Once all contributions are recorded, any caller may trigger payout to the current recipient.
5. **Resolve** — Defaulters may be slashed permissionlessly. After all rounds, members reclaim collateral. Trust scores are updated for every participant.

## Trust Score

RoundChain maintains a per-address reputation ledger in contract storage. Scores are derived from participation history and cannot be reset by the user.

| Outcome | Score change |
|---|---|
| Circle completed without default | +10 |
| Member slashed for non-payment | −25 |

Circle creators may require a minimum score at creation time. This enables tiered pools — e.g., a member with three clean completions (score 30) qualifies for higher-contribution circles — without reliance on off-chain credit bureaus.

```rust
// Score is floored at zero; stored as TrustScore { circles_completed, circles_defaulted, score }
score = max(0, completed × 10 − defaulted × 25)
```

## Deployment (Testnet)

| | |
|---|---|
| **Contract** | `CCDF2YTXH5B7ULUDQIM4LU4H633LQEFW3R75HWK76YFWMGJV2J6YSA7Y` |
| **Explorer** | [stellar.expert/explorer/testnet/contract/…](https://stellar.expert/explorer/testnet/contract/CCDF2YTXH5B7ULUDQIM4LU4H633LQEFW3R75HWK76YFWMGJV2J6YSA7Y) |
| **USDC (Circle SAC)** | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| **Network** | Stellar Testnet |

## Repository

```
roundchain-contract/     Soroban contract (Rust, SDK v26)
  contracts/roundchain/  Core ROSCA + trust score logic
  scripts/deploy.sh        Testnet deployment

roundchain-web/            Next.js 14 application
  src/lib/contract.ts      Contract bindings & RPC client
  src/components/          Circle dashboard, admin panel, wallet UI
```

Contract test suite: **20 passing tests** covering lifecycle, slashing, payout randomization, trust gating, and input validation.

Web client: **38 unit tests** (Vitest) for trust scoring, circle logic, error parsing, and contract data normalization.

CI runs both suites on every push to `main` via GitHub Actions (`.github/workflows/test.yml`).

## Contract Interface

### State transitions

| Function | Authorization | Description |
|---|---|---|
| `create_circle` | Admin | Initialize circle parameters and optional trust threshold |
| `join_circle` | Member | Deposit collateral; validate trust score |
| `start_circle` | Admin | Transition to active; shuffle payout order |
| `contribute` | Member | Submit round payment |
| `trigger_payout` | Any | Disburse pot to current recipient; advance round |
| `slash_defaulter` | Any | Forfeit slashed member's collateral |
| `claim_collateral` | Member | Withdraw remaining collateral post-completion |

### Read-only

`get_circle` · `get_member` · `get_contribution_status` · `get_next_circle_id` · `get_trust_score`

## Local Development

**Prerequisites:** Rust toolchain, [Stellar CLI](https://developers.stellar.org/docs/tools/cli), Node.js 18+, [Freighter](https://www.freighter.app/) (testnet).

```bash
# Contract
cd roundchain-contract && cargo test --manifest-path contracts/roundchain/Cargo.toml

# Frontend
cd roundchain-web
cp .env.local.example .env.local
npm install && npm test && npm run dev
```

Configure Freighter for testnet, establish a USDC trustline (Circle issuer), and fund via [faucet.circle.com](https://faucet.circle.com/). An optional server-side faucet is available by setting `FAUCET_SECRET_KEY` in `.env.local`.

See [`roundchain-contract/README.md`](roundchain-contract/README.md) and [`roundchain-web/README.md`](roundchain-web/README.md) for module-level documentation.

## Technology

| Layer | Stack |
|---|---|
| Smart contract | Rust, Soroban SDK 26, Stellar Asset Contract (USDC) |
| Client | Next.js 14, TypeScript, Tailwind CSS, `@stellar/stellar-sdk` |
| Wallet | Freighter via `@stellar/freighter-api` |
| Infrastructure | Soroban RPC (testnet), Stellar Expert explorer |

## License

MIT
