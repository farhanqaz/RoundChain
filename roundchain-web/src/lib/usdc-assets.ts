import { Asset } from "@stellar/stellar-sdk";

/** Circle testnet USDC — works with faucet.circle.com (Stellar Testnet) */
export const USDC_ASSET_CODE = "USDC";
export const USDC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export const USDC_SAC =
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

export const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";
export const CIRCLE_FAUCET_URL = "https://faucet.circle.com/";

const TOKEN_ISSUERS: Record<string, string> = {
  [USDC_SAC]: USDC_ISSUER,
};

export function resolveUsdcIssuer(tokenContractId: string): string {
  return TOKEN_ISSUERS[tokenContractId] ?? USDC_ISSUER;
}

export function usdcAsset(issuer: string = USDC_ISSUER) {
  return new Asset(USDC_ASSET_CODE, issuer);
}
