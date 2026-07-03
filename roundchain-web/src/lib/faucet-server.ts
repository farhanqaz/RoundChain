import {
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  Address as StellarAddress,
} from "@stellar/stellar-sdk";
import {
  FAUCET_USDC_AMOUNT,
  NETWORK_PASSPHRASE,
  SOROBAN_RPC,
} from "./constants";
import { USDC_SAC } from "./usdc-assets";

const FRIENDBOT = "https://friendbot.stellar.org";

function parseTransferSimulationError(simulated: rpc.Api.SimulateTransactionResponse): string {
  const raw = JSON.stringify(simulated);
  if (raw.includes("trustline entry is missing") || raw.includes("TrustlineMissing")) {
    return "Penerima belum punya trustline USDC";
  }
  if (
    raw.includes("insufficient balance") ||
    raw.includes("Underfunded") ||
    raw.includes("InsufficientBalance")
  ) {
    return "Wallet faucet kosong — isi via Circle faucet ke akun faucet";
  }
  const err =
    typeof simulated === "object" &&
    simulated !== null &&
    "error" in simulated &&
    typeof simulated.error === "string"
      ? simulated.error
      : null;
  if (err) return err.slice(0, 180);
  return "Simulasi transfer USDC gagal";
}

export async function dripXlm(publicKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${FRIENDBOT}?addr=${encodeURIComponent(publicKey)}`);
    if (res.ok) return { ok: true };
    const text = await res.text();
    if (text.includes("already funded") || text.includes("createAccountAlreadyExist")) {
      return { ok: true };
    }
    return { ok: false, error: text.slice(0, 200) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Friendbot failed" };
  }
}

export async function dripUsdc(
  faucetSecret: string,
  receiver: string
): Promise<{ ok: boolean; hash?: string; error?: string }> {
  try {
    const keypair = Keypair.fromSecret(faucetSecret);
    const server = new rpc.Server(SOROBAN_RPC);
    const account = await server.getAccount(keypair.publicKey());

    const token = new Contract(USDC_SAC);
    const tx = new TransactionBuilder(account, {
      fee: "2000000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        token.call(
          "transfer",
          new StellarAddress(keypair.publicKey()).toScVal(),
          new StellarAddress(receiver).toScVal(),
          nativeToScVal(FAUCET_USDC_AMOUNT, { type: "i128" })
        )
      )
      .setTimeout(180)
      .build();

    const simulated = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulated)) {
      return { ok: false, error: parseTransferSimulationError(simulated) };
    }

    const assembled = rpc.assembleTransaction(tx, simulated).build();
    assembled.sign(keypair);

    const result = await server.sendTransaction(assembled);
    if (result.status === "ERROR") {
      return { ok: false, error: "Transfer USDC ditolak" };
    }

    if (result.status === "PENDING") {
      let getResult = await server.getTransaction(result.hash);
      while (getResult.status === "NOT_FOUND") {
        await new Promise((r) => setTimeout(r, 1000));
        getResult = await server.getTransaction(result.hash);
      }
      if (getResult.status !== "SUCCESS") {
        return { ok: false, error: "Transfer USDC gagal on-chain" };
      }
    }

    return { ok: true, hash: result.hash };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Drip USDC gagal" };
  }
}
