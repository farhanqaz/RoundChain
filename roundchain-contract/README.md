# RoundChain — Soroban Contract

Rust implementation of a trustless ROSCA on Stellar Soroban. Handles collateral custody, round-based contributions, randomized payout sequencing, permissionless slashing, and persistent trust scores.

## Build & Test

```bash
stellar contract build
cargo test --manifest-path contracts/roundchain/Cargo.toml   # 25 tests
```

## Deploy

```bash
./scripts/deploy.sh
```

Update `NEXT_PUBLIC_CONTRACT_ID` in the web client after deployment.

## Data Model

**CircleState** — creator, token, contribution amount, period duration, member cap, round index, status (`Pending` | `Active` | `Completed` | `Cancelled`), payout order, optional `min_trust_score`, `created_at`, optional `join_deadline`.

**MemberState** — collateral balance, contributions paid, payout received flag, slash status, claim status.

**TrustScore** — per-address `{ circles_completed, circles_defaulted, score }`.

## Entry Points

### Creator / setup

| Function | Returns | Notes |
|---|---|---|
| `create_circle(creator, token, amount, period, max_members, min_trust_score?, join_deadline?)` | `u32` | Allocates circle ID |
| `cancel_circle(circle_id)` | — | Creator or anyone after join deadline; refunds all |

### Member-gated

| Function | Notes |
|---|---|
| `join_circle(circle_id, member)` | Transfers collateral; auto-starts when full |
| `leave_circle(circle_id, member)` | Refund while Pending |
| `contribute(circle_id, member)` | Records round payment |
| `exit_circle(circle_id, member)` | Voluntary forfeit during Active |
| `claim_collateral(circle_id, member)` | Post-completion withdrawal |

### Permissionless

| Function | Notes |
|---|---|
| `start_circle(circle_id)` | Recovery if Pending + full (normally auto-started) |
| `trigger_payout(circle_id)` | Pays current recipient when all active members paid |
| `slash_defaulter(circle_id, member)` | Forfeits collateral after deadline |

### Views

`get_circle` · `get_member` · `get_contribution_status` · `get_next_circle_id` · `get_trust_score`

## Trust Score Constants

```rust
TRUST_POINTS_COMPLETED: 10
TRUST_PENALTY_DEFAULTED: 25
```

Score is recomputed as `max(0, completed × 10 − defaulted × 25)` and written to storage when a circle completes.

## Invocation Examples

Open circle:

```bash
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet -- create_circle \
  --creator $(stellar keys address alice) \
  --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA \
  --contribution_amount 10000000 \
  --period_duration 604800 \
  --max_members 5 \
  --min_trust_score null \
  --join_deadline null
```

Trust-gated circle (minimum score 20):

```bash
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet -- create_circle \
  --creator $(stellar keys address alice) \
  --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA \
  --contribution_amount 50000000 \
  --period_duration 604800 \
  --max_members 5 \
  --min_trust_score 20 \
  --join_deadline null
```

## Testnet Asset

| Asset | Contract Address |
|---|---|
| USDC (Circle SAC) | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
