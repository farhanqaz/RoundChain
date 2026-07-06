#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WASM="$ROOT/target/wasm32v1-none/release/roundchain.wasm"
SOURCE="${STELLAR_SOURCE:-alice}"
NETWORK="${STELLAR_NETWORK:-testnet}"
USDC_SAC="${USDC_SAC:-CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA}"

export CARGO_TARGET_DIR="$ROOT/target"

echo "==> Building contract..."
cd "$ROOT"
stellar contract build

echo "==> Deploying to $NETWORK as $SOURCE..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$SOURCE" \
  --network "$NETWORK" \
  --alias roundchain)

echo ""
echo "Deployed RoundChain contract:"
echo "  CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "Add to roundchain-web/.env.local:"
echo "  NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "Example create_circle:"
echo "  stellar contract invoke --id $CONTRACT_ID --source $SOURCE --network $NETWORK -- create_circle \\"
echo "    --creator \$(stellar keys address $SOURCE) \\"
echo "    --token $USDC_SAC \\"
echo "    --contribution_amount 10000000 \\"
echo "    --period_duration 604800 \\"
echo "    --max_members 5 \\"
echo "    --min_trust_score null \\"
echo "    --join_deadline null"
