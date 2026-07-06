import {
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  Address as StellarAddress,
  xdr,
  rpc,
} from "@stellar/stellar-sdk";
import {
  CONTRACT_ID,
  EXPLORER_TX_URL,
  NETWORK_PASSPHRASE,
  SOROBAN_RPC,
} from "./constants";
import { parseContractError } from "./errors";
import { getClassicUsdcBalance, hasUsdcTrustline, resolveUsdcIssuer } from "./usdc";

export interface TokenBalanceInfo {
  balance: bigint;
  needsTrustline: boolean;
  hasLegacyCircleUsdc: boolean;
  issuer: string;
}

export const server = new rpc.Server(SOROBAN_RPC);

export type CircleStatus = "Pending" | "Active" | "Completed" | "Cancelled";

export interface CircleState {
  creator: string;
  token: string;
  contribution_amount: bigint;
  period_duration: bigint;
  max_members: number;
  member_count: number;
  current_round: number;
  total_rounds: number;
  status: CircleStatus;
  payout_order: string[];
  next_payout_time: bigint;
  min_trust_score: number | null;
  created_at: bigint;
  join_deadline: bigint;
  activated_at: bigint;
  /** @deprecated use creator */
  admin: string;
}

export interface TrustScore {
  address: string;
  circles_completed: number;
  circles_defaulted: number;
  score: number;
}

export interface MemberState {
  address: string;
  collateral_deposited: bigint;
  contributions_paid: number;
  has_received_payout: boolean;
  is_slashed: boolean;
  collateral_claimed: boolean;
  is_exited_clean: boolean;
  prepaid_rounds: number;
  exit_at_round: number;
  trust_settled: boolean;
}

export interface ContributionEntry {
  address: string;
  paid: boolean;
}

export interface MemberDetail extends ContributionEntry {
  collateral_deposited: bigint;
  is_slashed: boolean;
  has_received_payout: boolean;
  collateral_claimed: boolean;
  is_exited_clean: boolean;
}

export interface TxResult {
  hash: string;
  returnValue?: unknown;
}

function contract() {
  if (!CONTRACT_ID) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ID is not set");
  }
  return new Contract(CONTRACT_ID);
}

function addressScVal(addr: string) {
  return new StellarAddress(addr).toScVal();
}

function toBigInt(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(v);
  if (typeof v === "string") return BigInt(v);
  return BigInt(0);
}

function toAddress(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "toString" in v) {
    return String(v);
  }
  return String(v);
}

const CIRCLE_STATUSES = ["Pending", "Active", "Completed", "Cancelled"] as const;

function parseEnumVariant(raw: unknown): string | null {
  if (typeof raw === "string" && CIRCLE_STATUSES.includes(raw as CircleStatus)) {
    return raw;
  }
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === "string" && CIRCLE_STATUSES.includes(first as CircleStatus)) {
      return first;
    }
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if ("tag" in raw) {
      const tag = (raw as { tag: string }).tag;
      if (CIRCLE_STATUSES.includes(tag as CircleStatus)) return tag;
    }
    for (const key of CIRCLE_STATUSES) {
      if (key in (raw as object)) return key;
    }
  }
  if (typeof raw === "number") {
    const idx = raw;
    if (idx >= 0 && idx < CIRCLE_STATUSES.length) return CIRCLE_STATUSES[idx];
  }
  return null;
}

function parseStatus(raw: unknown): CircleStatus {
  const variant = parseEnumVariant(raw);
  if (variant === "Pending" || variant === "Active" || variant === "Completed" || variant === "Cancelled") {
    return variant;
  }
  return "Pending";
}

function parseOptionalU32(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    return Number(raw[0]);
  }
  if (typeof raw === "object" && raw !== null) {
    if ("tag" in raw && (raw as { tag: string }).tag === "None") return null;
    if ("Some" in raw) return Number((raw as { Some: unknown }).Some);
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function normalizeCircle(raw: Record<string, unknown>): CircleState {
  const payoutRaw = raw.payout_order;
  const payout_order = Array.isArray(payoutRaw)
    ? payoutRaw.map(toAddress)
    : [];

  const creator = toAddress(raw.creator ?? raw.admin);

  return {
    creator,
    admin: creator,
    token: toAddress(raw.token),
    contribution_amount: toBigInt(raw.contribution_amount),
    period_duration: toBigInt(raw.period_duration),
    max_members: Number(raw.max_members ?? 0),
    member_count: Number(raw.member_count ?? 0),
    current_round: Number(raw.current_round ?? 0),
    total_rounds: Number(raw.total_rounds ?? 0),
    status: parseStatus(raw.status),
    payout_order,
    next_payout_time: toBigInt(raw.next_payout_time),
    min_trust_score: parseOptionalU32(raw.min_trust_score),
    created_at: toBigInt(raw.created_at),
    join_deadline: toBigInt(raw.join_deadline ?? 0),
    activated_at: toBigInt(raw.activated_at ?? 0),
  };
}

export function normalizeTrustScore(raw: Record<string, unknown>): TrustScore {
  return {
    address: toAddress(raw.address),
    circles_completed: Number(raw.circles_completed ?? 0),
    circles_defaulted: Number(raw.circles_defaulted ?? 0),
    score: Number(raw.score ?? 0),
  };
}

export function normalizeMember(raw: Record<string, unknown>): MemberState {
  return {
    address: toAddress(raw.address),
    collateral_deposited: toBigInt(raw.collateral_deposited),
    contributions_paid: Number(raw.contributions_paid ?? 0),
    has_received_payout: Boolean(raw.has_received_payout),
    is_slashed: Boolean(raw.is_slashed),
    collateral_claimed: Boolean(raw.collateral_claimed),
    is_exited_clean: Boolean(raw.is_exited_clean),
    prepaid_rounds: Number(raw.prepaid_rounds ?? 0),
    exit_at_round: Number(raw.exit_at_round ?? 0),
    trust_settled: Boolean(raw.trust_settled),
  };
}

/** Collateral locked at join: (max_members - 1) × contribution */
export function collateralForCircle(contribution: bigint, maxMembers: number): bigint {
  if (maxMembers < 2) return contribution;
  return contribution * BigInt(maxMembers - 1);
}

const DUMMY_ACCOUNT =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

async function simulateRead(fn: string, ...args: xdr.ScVal[]): Promise<xdr.ScVal> {
  const tx = new TransactionBuilder(
    await server.getAccount(DUMMY_ACCOUNT),
    { fee: "100000", networkPassphrase: NETWORK_PASSPHRASE }
  )
    .addOperation(contract().call(fn, ...args))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(parseContractError(simulated));
  }
  const val = simulated.result?.retval;
  if (!val) throw new Error("No return value from contract");
  return val;
}

export async function loadAccount(publicKey: string) {
  return server.getAccount(publicKey);
}

export async function getUsdcBalanceInfo(
  holder: string,
  tokenContractId?: string
): Promise<TokenBalanceInfo> {
  const issuer = resolveUsdcIssuer(tokenContractId ?? "");
  const trustline = await hasUsdcTrustline(holder, issuer);
  if (!trustline) {
    return {
      balance: BigInt(0),
      needsTrustline: true,
      hasLegacyCircleUsdc: false,
      issuer,
    };
  }
  return {
    balance: await getClassicUsdcBalance(holder, issuer),
    needsTrustline: false,
    hasLegacyCircleUsdc: false,
    issuer,
  };
}

export async function getTokenBalance(
  tokenId: string,
  holder: string
): Promise<bigint> {
  const info = await getUsdcBalanceInfo(holder);
  if (info.needsTrustline) return BigInt(0);
  const token = new Contract(tokenId);
  const tx = new TransactionBuilder(
    await server.getAccount(DUMMY_ACCOUNT),
    { fee: "100000", networkPassphrase: NETWORK_PASSPHRASE }
  )
    .addOperation(token.call("balance", addressScVal(holder)))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    return info.balance;
  }
  const val = simulated.result?.retval;
  if (!val) return info.balance;
  return toBigInt(scValToNative(val));
}

export async function simulateAndSend(
  publicKey: string,
  signTransaction: (xdr: string) => Promise<string>,
  operation: xdr.Operation
): Promise<TxResult> {
  const account = await loadAccount(publicKey);
  const tx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(180)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(parseContractError(simulated));
  }

  const returnValue = simulated.result?.retval
    ? scValToNative(simulated.result.retval)
    : undefined;

  const assembled = rpc.assembleTransaction(tx, simulated).build();
  const signedXdr = await signTransaction(assembled.toXDR());
  const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.sendTransaction(signed);

  if (result.status === "PENDING") {
    let getResult = await server.getTransaction(result.hash);
    while (getResult.status === "NOT_FOUND") {
      await new Promise((r) => setTimeout(r, 1000));
      getResult = await server.getTransaction(result.hash);
    }
    if (getResult.status !== "SUCCESS") {
      const failMsg =
        getResult.status === "FAILED" && "resultXdr" in getResult
          ? parseContractError(getResult.resultXdr ?? getResult)
          : "Transaction failed on-chain";
      throw new Error(failMsg);
    }
    return { hash: result.hash, returnValue };
  }

  if (result.status === "ERROR") {
    throw new Error(parseContractError(result));
  }

  return { hash: result.hash, returnValue };
}

export async function getTrustScore(address: string): Promise<TrustScore> {
  const val = await simulateRead("get_trust_score", addressScVal(address));
  return normalizeTrustScore(scValToNative(val) as Record<string, unknown>);
}

export async function getCircle(circleId: number): Promise<CircleState> {
  const val = await simulateRead(
    "get_circle",
    nativeToScVal(circleId, { type: "u32" })
  );
  return normalizeCircle(scValToNative(val) as Record<string, unknown>);
}

export async function getMember(
  circleId: number,
  member: string
): Promise<MemberState> {
  const val = await simulateRead(
    "get_member",
    nativeToScVal(circleId, { type: "u32" }),
    addressScVal(member)
  );
  return normalizeMember(scValToNative(val) as Record<string, unknown>);
}

export async function getContributionStatus(
  circleId: number,
  round: number
): Promise<ContributionEntry[]> {
  const val = await simulateRead(
    "get_contribution_status",
    nativeToScVal(circleId, { type: "u32" }),
    nativeToScVal(round, { type: "u32" })
  );
  const raw = scValToNative(val) as Array<Record<string, unknown>>;
  return raw.map((entry) => ({
    address: toAddress(entry.address),
    paid: Boolean(entry.paid),
  }));
}

export async function getNextCircleId(): Promise<number> {
  try {
    const val = await simulateRead("get_next_circle_id");
    return Number(scValToNative(val));
  } catch {
    return 0;
  }
}

export async function listCircles(): Promise<
  Array<{ id: number; circle: CircleState }>
> {
  const nextId = await getNextCircleId();
  if (nextId <= 1) {
    // Fallback: probe if contract not redeployed with get_next_circle_id
    const circles: Array<{ id: number; circle: CircleState }> = [];
    for (let id = 1; id <= 20; id++) {
      try {
        circles.push({ id, circle: await getCircle(id) });
      } catch {
        break;
      }
    }
    return circles;
  }

  const circles: Array<{ id: number; circle: CircleState }> = [];
  for (let id = 1; id < nextId; id++) {
    try {
      circles.push({ id, circle: await getCircle(id) });
    } catch {
      // skip missing
    }
  }
  return circles;
}

export async function getMemberDetails(
  circleId: number,
  round: number
): Promise<MemberDetail[]> {
  const contributions = await getContributionStatus(circleId, round);
  const details: MemberDetail[] = [];
  for (const entry of contributions) {
    try {
      const member = await getMember(circleId, entry.address);
      details.push({ ...entry, ...member });
    } catch {
      details.push({
        ...entry,
        collateral_deposited: BigInt(0),
        is_slashed: false,
        has_received_payout: false,
        collateral_claimed: false,
        is_exited_clean: false,
      });
    }
  }
  return details;
}

function optionalU32ScVal(value: number | null | undefined): xdr.ScVal {
  if (value == null) {
    return xdr.ScVal.scvVoid();
  }
  return nativeToScVal(value, { type: "u32" });
}

function optionalU64ScVal(value: bigint | number | null | undefined): xdr.ScVal {
  if (value == null) {
    return xdr.ScVal.scvVoid();
  }
  return nativeToScVal(typeof value === "bigint" ? value : BigInt(value), { type: "u64" });
}

export function buildCreateCircleOp(params: {
  creator: string;
  token: string;
  contributionAmount: bigint;
  periodDuration: bigint;
  maxMembers: number;
  minTrustScore?: number | null;
  joinDeadline?: bigint | number | null;
}) {
  return contract().call(
    "create_circle",
    addressScVal(params.creator),
    addressScVal(params.token),
    nativeToScVal(params.contributionAmount, { type: "i128" }),
    nativeToScVal(params.periodDuration, { type: "u64" }),
    nativeToScVal(params.maxMembers, { type: "u32" }),
    optionalU32ScVal(params.minTrustScore),
    optionalU64ScVal(params.joinDeadline)
  );
}

export function buildJoinCircleOp(circleId: number, member: string) {
  return contract().call(
    "join_circle",
    nativeToScVal(circleId, { type: "u32" }),
    addressScVal(member)
  );
}

export function buildContributeOp(circleId: number, member: string) {
  return contract().call(
    "contribute",
    nativeToScVal(circleId, { type: "u32" }),
    addressScVal(member)
  );
}

export function buildLeaveCircleOp(circleId: number, member: string) {
  return contract().call(
    "leave_circle",
    nativeToScVal(circleId, { type: "u32" }),
    addressScVal(member)
  );
}

export function buildCompleteExitOp(circleId: number, member: string) {
  return contract().call(
    "complete_exit",
    nativeToScVal(circleId, { type: "u32" }),
    addressScVal(member)
  );
}

export function buildExitCircleOp(circleId: number, member: string) {
  return contract().call(
    "exit_circle",
    nativeToScVal(circleId, { type: "u32" }),
    addressScVal(member)
  );
}

export function buildCancelCircleOp(circleId: number, caller: string) {
  return contract().call(
    "cancel_circle",
    nativeToScVal(circleId, { type: "u32" }),
    addressScVal(caller)
  );
}

export function buildStartCircleOp(circleId: number) {
  return contract().call("start_circle", nativeToScVal(circleId, { type: "u32" }));
}

export function buildTriggerPayoutOp(circleId: number) {
  return contract().call("trigger_payout", nativeToScVal(circleId, { type: "u32" }));
}

export function buildSlashDefaulterOp(circleId: number, member: string) {
  return contract().call(
    "slash_defaulter",
    nativeToScVal(circleId, { type: "u32" }),
    addressScVal(member)
  );
}

export function buildClaimCollateralOp(circleId: number, member: string) {
  return contract().call(
    "claim_collateral",
    nativeToScVal(circleId, { type: "u32" }),
    addressScVal(member)
  );
}

export async function signWithFreighter(xdr: string): Promise<string> {
  const { signTransaction } = await import("@stellar/freighter-api");
  const result = await signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  if ("error" in result && result.error) {
    throw new Error(result.error);
  }
  return result.signedTxXdr;
}

export function formatUsdc(amount: bigint): string {
  const whole = amount / BigInt(10_000_000);
  const frac = amount % BigInt(10_000_000);
  return `${whole}.${frac.toString().padStart(7, "0").replace(/0+$/, "") || "0"}`;
}

export { formatPeriod, timeRemaining, isPeriodEnded } from "./circle-logic";

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_TX_URL}/${hash}`;
}

export function shortenAddress(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 1) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}
