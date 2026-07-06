# RoundChain — Soroban Contract

Rust implementation of a trustless ROSCA on Stellar Soroban. Collateral custody, shuffled payout order, recipient-exempt contributions, permissionless slashing, fair exit after payout, and persistent trust scores.

## Build & Test

```bash
stellar contract build
cargo test --manifest-path contracts/roundchain/Cargo.toml   # 17 tests
```

## Deploy

```bash
./scripts/deploy.sh
```

Runs `init(allowed_token, fee_recipient, platform_fee_bps)` with Circle USDC SAC and 1% payout fee. Update `NEXT_PUBLIC_CONTRACT_ID` in the web client.

**Current testnet deployment:** `CDYUIAZD2RCFRX7FYVKGPE2ED4H4ZUNGHMSGEOVKA42OAK3CBBVE55KO`

## ROSCA Rules (on-chain)

- **n−1 contributors** pay each round; the scheduled recipient is **exempt** that round.
- **Pot size** = active contributors × contribution (not inflated when members are slashed or exited).
- **Slash** only after `next_payout_time`; recipient cannot be slashed on their payout round.
- **Creator** must meet `min_trust_score` when creating a circle (same as joiners).
- **Complete exit** prepays remaining rounds; trust +10 applied at circle `Completed` (not immediately).
- **Voluntary exit** before payout forfeits collateral; blocked mid-round after paying.

## Data Model

**CircleState** — creator, token, contribution, period, member cap, round index, status (`Pending` | `Active` | `Completed` | `Cancelled`), shuffled payout order, `min_trust_score`, `join_deadline`, `activated_at`.

**MemberState** — collateral, contributions paid, payout received, slash status, `is_exited_clean`, `prepaid_rounds`, `trust_settled`.

**TrustScore** — `{ circles_completed, circles_defaulted, score }` with `score = max(0, completed×10 − defaulted×25)`.

Collateral at join: `(max_members − 1) × contribution_amount`.

## Entry Points

| Function | Notes |
|---|---|
| `init(allowed_token, fee_recipient, platform_fee_bps)` | One-time USDC whitelist + payout fee (max 500 bps) |
| `create_circle(...)` | Opens circle + auto-enrolls creator (trust-checked); optional join deadline |
| `join_circle` | Deposits collateral; auto-starts when full |
| `leave_circle` | Refund while Pending |
| `cancel_circle` | Creator if empty; anyone after join deadline |
| `start_circle` | Recovery if Pending + full |
| `contribute` | Pay current round — **rejected for scheduled recipient** |
| `trigger_payout` | Permissionless when contributors paid + period ended; fee to treasury |
| `slash_defaulter` | Forfeit defaulter collateral to active members |
| `complete_exit` | After payout: prepay remaining rounds, return collateral |
| `exit_circle` | Before payout: forfeit collateral after period ends |
| `claim_collateral` | Post-completion (also auto-claimed) |

Views: `get_circle` · `get_member` · `get_contribution_status` · `get_next_circle_id` · `get_trust_score` · `get_fee_config`

## Test Coverage

| Test | What it verifies |
|---|---|
| `test_recipient_cannot_contribute` | Recipient exempt from payment |
| `test_no_stranded_funds_after_full_cycle` | Contract balance zero after full cycle |
| `test_default_reduced_pot_not_inflated` | Pot shrinks when contributor slashed |
| `test_full_cycle_with_default_completes` | Circle completes with mid-cycle default |
| `test_creator_rejected_insufficient_trust` | Creator must meet min trust |
| `test_exit_blocked_after_contributing` | No exit after paying same round |

## Testnet Asset

| Asset | Contract Address |
|---|---|
| USDC (Circle SAC) | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |
