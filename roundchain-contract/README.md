# RoundChain Contract

Soroban smart contract for trustless ROSCA (arisan) on Stellar testnet.

## Development

```bash
stellar contract build
cargo test
./scripts/deploy.sh
```

## API

### Admin
- **create_circle**(admin, token, contribution_amount, period_duration, max_members, min_trust_score?) → circle_id
- **start_circle**(circle_id)

### Members
- **join_circle**(circle_id, member)
- **contribute**(circle_id, member)
- **claim_collateral**(circle_id, member)

### Permissionless
- **trigger_payout**(circle_id)
- **slash_defaulter**(circle_id, member)

### Views
- **get_circle**, **get_member**, **get_contribution_status**, **get_next_circle_id**, **get_trust_score**

## Trust score

| Event | Points |
|-------|--------|
| Arisan selesai bersih | +10 |
| Default (slashed) | −25 |

`min_trust_score` on `create_circle` gates `join_circle`. Score stored per address in contract storage.

## Testnet

| Asset | Address |
|-------|---------|
| USDC SAC (Circle) | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |

## Deploy

```bash
./scripts/deploy.sh
```

```bash
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet -- create_circle \
  --admin $(stellar keys address alice) \
  --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA \
  --contribution_amount 10000000 \
  --period_duration 604800 \
  --max_members 5 \
  --min_trust_score null
```

Gated circle (min 20 trust = 2 arisan bersih):

```bash
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet -- create_circle \
  --admin $(stellar keys address alice) \
  --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA \
  --contribution_amount 50000000 \
  --period_duration 604800 \
  --max_members 5 \
  --min_trust_score 20
```

At **start_circle**, payout order is shuffled on-chain (Soroban PRNG).
