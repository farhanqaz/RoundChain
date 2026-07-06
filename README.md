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
| **Collateral escrow** | USDC locked at join; released after circle completion or clean exit |
| **Fair payout order** | Fisher–Yates shuffle via Soroban PRNG when the last member joins |
| **Auto-start** | No admin gate — circle activates when full |
| **Round enforcement** | n−1 contributors pay each round; scheduled recipient is exempt. Permissionless slashing after period ends |
| **Default handling** | Pot scales to active contributors only — no inflated payouts when someone is slashed |
| **Financial reputation** | Persistent trust score; optional minimum score gates entry (applies to creator and joiners) |
| **Platform fee** | Configurable per deploy (default 1%, max 5%); read on-chain via `get_fee_config` |

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
│       └──── contribute ◄──► trigger_payout (contributors paid)  │
│                    │                                            │
│     slash_defaulter / exit_circle / complete_exit               │
│                    │                                            │
│         claim_collateral + trust score update                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    Circle USDC (SAC)
```

### Circle lifecycle

1. **Configure** — Set members, contribution per round, and round length (weekly / bi-weekly / monthly / custom). Optional min trust score and join window in advanced settings.
2. **Enroll** — Creator is enrolled automatically on create (must meet min trust if set); others join via invite link and deposit collateral. **Leave** anytime while Pending for a full refund.
3. **Activate** — When the last member joins, payout order is shuffled on-chain and the circle becomes Active.
4. **Operate** — Each round, every active member **except the scheduled recipient** must contribute. Anyone can trigger payout once all obligated contributors paid and the period ended.
5. **Resolve** — After your payout turn, use **complete exit** to prepay remaining rounds and reclaim collateral. Trust +10 is credited when the circle completes.

Circles still Pending can be **cancelled** by the creator (if empty), or by anyone after the join deadline.

### Pot math (example)

3 members, 1 USDC per round → **2 USDC gross pot** per round (recipient does not pay that round). Net payout deducts the platform fee.

## Trust Score

RoundChain maintains a per-address reputation ledger in contract storage. Scores are derived from participation history and cannot be reset by the user.

| Outcome | Score change |
|---|---|
| Circle completed without default | +10 |
| **Complete exit** after payout (credited when circle completes) | +10 |
| Member slashed for non-payment | −25 (immediate) |

Circle creators may require a minimum score at creation time — **the creator must meet it too**. This enables tiered pools without off-chain credit bureaus.

```rust
score = max(0, completed × 10 − defaulted × 25)
```

## Deployment (Testnet)

| | |
|---|---|
| **Contract** | `CDYUIAZD2RCFRX7FYVKGPE2ED4H4ZUNGHMSGEOVKA42OAK3CBBVE55KO` |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDYUIAZD2RCFRX7FYVKGPE2ED4H4ZUNGHMSGEOVKA42OAK3CBBVE55KO) |
| **USDC (Circle SAC)** | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
| **Network** | Stellar Testnet |

## Repository

```
roundchain-contract/     Soroban contract (Rust, SDK v26)
  contracts/roundchain/  Core ROSCA + trust score logic
  scripts/deploy.sh      Testnet deployment

roundchain-web/          Next.js 14 application
  src/lib/contract.ts    Contract bindings & RPC client
  src/components/        Circle dashboard, wallet UI, member actions
```

| Suite | Tests |
|---|---|
| Soroban contract | **17** (fair exit, default pot, full-cycle with default, recipient exempt) |
| Web client (Vitest) | **40** (circle logic, trust, errors, contract parsing) |

CI runs both suites on every push to `main` via [GitHub Actions](.github/workflows/test.yml).

## Contract Interface

### State transitions

| Function | Authorization | Description |
|---|---|---|
| `init` | Once | Whitelist USDC token, fee recipient, platform fee bps |
| `create_circle` | Creator | Open circle + auto-enroll creator; optional trust & join deadline |
| `join_circle` | Member | Deposit collateral; auto-starts when full |
| `leave_circle` | Member | Refund collateral while Pending |
| `cancel_circle` | Creator / anyone after deadline | Refund all members |
| `start_circle` | Any | Recovery if Pending + full |
| `contribute` | Member | Pay current round (recipient cannot pay on their turn) |
| `trigger_payout` | Any | Disburse pot when contributors paid + period ended |
| `slash_defaulter` | Any | Forfeit defaulter collateral (after period ends) |
| `complete_exit` | Member (after payout) | Prepay remaining rounds; collateral returned |
| `exit_circle` | Member (before payout) | Forfeit collateral after period ends (not after paying same round) |
| `claim_collateral` | Member | Withdraw collateral post-completion |

### Read-only

`get_circle` · `get_member` · `get_contribution_status` · `get_next_circle_id` · `get_trust_score` · `get_fee_config`

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

Configure Freighter for testnet, establish a USDC trustline (Circle issuer), and fund via [faucet.circle.com](https://faucet.circle.com/). Optional server-side faucet: set `FAUCET_SECRET_KEY` in `.env.local`.

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
