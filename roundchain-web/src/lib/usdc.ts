import {
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { usdcAsset, HORIZON_TESTNET, USDC_ASSET_CODE, USDC_ISSUER } from "./usdc-assets";

export {
  CIRCLE_FAUCET_URL,
  HORIZON_TESTNET,
  USDC_ASSET_CODE,
  USDC_ISSUER,
  USDC_SAC,
  resolveUsdcIssuer,
} from "./usdc-assets";

const horizon = new Horizon.Server(HORIZON_TESTNET);

export async function hasUsdcTrustline(
  publicKey: string,
  issuer: string = USDC_ISSUER
): Promise<boolean> {
  try {
    const account = await horizon.loadAccount(publicKey);
    return account.balances.some(
      (b) =>
        b.asset_type !== "native" &&
        "asset_code" in b &&
        b.asset_code === USDC_ASSET_CODE &&
        b.asset_issuer === issuer
    );
  } catch {
    return false;
  }
}

export async function getClassicUsdcBalance(
  publicKey: string,
  issuer: string = USDC_ISSUER
): Promise<bigint> {
  try {
    const account = await horizon.loadAccount(publicKey);
    const line = account.balances.find(
      (b) =>
        b.asset_type !== "native" &&
        "asset_code" in b &&
        b.asset_code === USDC_ASSET_CODE &&
        b.asset_issuer === issuer
    );
    if (!line || !("balance" in line)) return BigInt(0);
    const parts = line.balance.split(".");
    const whole = BigInt(parts[0] ?? "0");
    const frac = BigInt((parts[1] ?? "0").padEnd(7, "0").slice(0, 7));
    return whole * BigInt(10_000_000) + frac;
  } catch {
    return BigInt(0);
  }
}

export async function buildChangeTrustXdr(
  publicKey: string,
  issuer: string = USDC_ISSUER
): Promise<string> {
  const account = await horizon.loadAccount(publicKey);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset(issuer) }))
    .setTimeout(180)
    .build();
  return tx.toXDR();
}

export async function ensureFaucetTrustline(faucetSecret: string): Promise<void> {
  const { Keypair } = await import("@stellar/stellar-sdk");
  const keypair = Keypair.fromSecret(faucetSecret);
  if (await hasUsdcTrustline(keypair.publicKey())) return;

  const account = await horizon.loadAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset() }))
    .setTimeout(180)
    .build();
  tx.sign(keypair);
  await horizon.submitTransaction(tx);
}
