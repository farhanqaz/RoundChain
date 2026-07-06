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
| **Fair payout order** | Fisher–Yates shuffle via Soroban PRNG when the last member joins |
| **Auto-start** | No admin gate — circle activates when full |
| **Round enforcement** | All members must contribute before payout; permissionless slashing |
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
│  create_circle ──► join_circle ──► [auto-start when full]       │
│       │                │               │                        │
│       │         [collateral in]  [shuffle payout order]         │
│       │                │               │                        │
│       ├── leave_circle / cancel_circle (while Pending)          │
│       └──── contribute ◄──► trigger_payout (all must pay)       │
│                    │                                            │
│              slash_defaulter / exit_circle                      │
│                    │                                            │
│         claim_collateral + trust score update                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    Circle USDC (SAC)
```

### Circle lifecycle

1. **Configure** — Creator sets contribution amount, period duration, member cap, optional trust threshold, and optional join deadline.
2. **Enroll** — Members join via invite link; collateral is locked in the contract. Members can **leave** while Pending for a full refund.
3. **Activate** — When the last member joins, payout order is shuffled and the circle becomes Active automatically.
4. **Operate** — Each round, all active members must contribute before payout releases. Defaulters may be slashed by anyone.
5. **Resolve** — Members reclaim collateral after completion. Voluntary **exit** during Active forfeits collateral (same as default). Trust scores update for all participants.

Circles still Pending can be **cancelled** by the creator, or by anyone after the join deadline passes.

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
| **Contract** | `CAMYAUF6SQJ5HFHHZVSGUZGPEYLS2YEFISWGB6ZGCLF5SNGL4BPQ2QX4` |
| **Explorer** | [stellar.expert/explorer/testnet/contract/…](https://stellar.expert/explorer/testnet/contract/CAMYAUF6SQJ5HFHHZVSGUZGPEYLS2YEFISWGB6ZGCLF5SNGL4BPQ2QX4) |
| **USDC (Circle SAC)** | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| **Network** | Stellar Testnet |

## Repository

```
roundchain-contract/     Soroban contract (Rust, SDK v26)
  contracts/roundchain/  Core ROSCA + trust score logic
  scripts/deploy.sh        Testnet deployment

roundchain-web/            Next.js 14 application
  src/lib/contract.ts      Contract bindings & RPC client
  src/components/          Circle dashboard, wallet UI, member actions
```

Contract test suite: **25 passing tests** covering auto-start, leave/cancel/exit, payout hardening, slashing, and trust gating.

Web client: **38 unit tests** (Vitest) for trust scoring, circle logic, error parsing, and contract data normalization.

CI runs both suites on every push to `main` via GitHub Actions (`.github/workflows/test.yml`).

## Contract Interface

### State transitions

| Function | Authorization | Description |
|---|---|---|
| `create_circle` | Creator | Initialize circle parameters, optional trust threshold & join deadline |
| `join_circle` | Member | Deposit collateral; auto-starts when full |
| `leave_circle` | Member | Refund collateral while Pending |
| `cancel_circle` | Creator / anyone after deadline | Refund all members; status Cancelled |
| `start_circle` | Any | Permissionless recovery if Pending + full |
| `contribute` | Member | Submit round payment |
| `trigger_payout` | Any | Disburse pot when all active members paid |
| `slash_defaulter` | Any | Forfeit defaulter collateral |
| `exit_circle` | Member | Voluntary forfeit during Active |
| `claim_collateral` | Member | Withdraw collateral post-completion |

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
