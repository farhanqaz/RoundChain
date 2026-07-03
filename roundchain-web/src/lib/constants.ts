export const SOROBAN_RPC =
  process.env.NEXT_PUBLIC_SOROBAN_RPC ?? "https://soroban-testnet.stellar.org";

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";

export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";

export const USDC_TOKEN =
  process.env.NEXT_PUBLIC_USDC_TOKEN ??
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

export const EXPLORER_TX_URL =
  process.env.NEXT_PUBLIC_EXPLORER_TX_URL ??
  "https://stellar.expert/explorer/testnet/tx";

export const EXPLORER_CONTRACT_URL =
  process.env.NEXT_PUBLIC_EXPLORER_CONTRACT_URL ??
  "https://stellar.expert/explorer/testnet/contract";

export const FAUCET_USDC_AMOUNT = BigInt(50_000_000); // 50 USDC (7 decimals)
export const DEMO_PERIOD_SECONDS = 60;
export const DEMO_CONTRIBUTION = 1_000_000; // 0.1 USDC

export const DEFAULT_CONTRIBUTION = 10_000_000;
export const DEFAULT_PERIOD = 604_800;
