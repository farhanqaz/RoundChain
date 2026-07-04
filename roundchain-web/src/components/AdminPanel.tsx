"use client";

import { useState } from "react";
import Link from "next/link";
import { ShareCircle } from "@/components/ShareCircle";
import { TxResult } from "@/components/TxResult";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import {
  activeDefaulters,
  isPeriodEnded,
  recipientIsDefaulter,
  scheduledRecipient,
  timeRemaining,
} from "@/lib/circle-logic";
import {
  buildSlashDefaulterOp,
  buildStartCircleOp,
  MemberDetail,
  shortenAddress,
  signWithFreighter,
  simulateAndSend,
} from "@/lib/contract";

interface Props {
  circleId: number;
  address: string;
  isAdmin: boolean;
  status: string;
  members: MemberDetail[];
  memberCount: number;
  maxMembers: number;
  currentRound: number;
  payoutOrder: string[];
  nextPayoutTime: bigint;
  adminInCircle: boolean;
  onSuccess: () => void;
}

export function AdminPanel({
  circleId,
  address,
  isAdmin,
  status,
  members,
  memberCount,
  maxMembers,
  currentRound,
  payoutOrder,
  nextPayoutTime,
  adminInCircle,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <Alert variant="warning" title="Admin only">
        Connect the wallet used to create this circle.{" "}
        <Link href={`/circle/${circleId}`} className="underline underline-offset-2">
          Back
        </Link>
      </Alert>
    );
  }

  const run = async (action: string, buildOp: () => ReturnType<typeof buildStartCircleOp>) => {
    setLoading(action);
    setError(null);
    setTxHash(null);
    try {
      const { hash } = await simulateAndSend(address, signWithFreighter, buildOp());
      setTxHash(hash);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setLoading(null);
    }
  };

  const defaulters = activeDefaulters(members);
  const periodEnded = isPeriodEnded(nextPayoutTime);
  const recipient = scheduledRecipient(payoutOrder, currentRound);
  const recipientDefaulted = recipientIsDefaulter(members, payoutOrder, currentRound);

  const canStart = status === "Pending" && memberCount >= maxMembers;
  const canSlash = status === "Active" && periodEnded && defaulters.length > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        backHref={`/circle/${circleId}`}
        backLabel="Circle"
        label="Admin"
        title={`Circle #${circleId}`}
        badge={<StatusBadge status={status} />}
      />

      {status === "Pending" && !adminInCircle && (
        <Alert variant="warning" title="You must join too">
          The admin is not automatically a member.{" "}
          <Link href={`/join/${circleId}`} className="underline">
            Join this circle
          </Link>{" "}
          first — you count as 1 of {maxMembers} members.
        </Alert>
      )}

      {status === "Active" && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted">Round {currentRound + 1}</p>
            <p className="font-medium text-foreground">{timeRemaining(nextPayoutTime)}</p>
          </div>
          {recipient && (
            <p className="text-sm text-muted">
              Scheduled recipient:{" "}
              <span className="font-mono text-foreground">{shortenAddress(recipient, 6)}</span>
            </p>
          )}
        </div>
      )}

      {status === "Pending" && <ShareCircle circleId={circleId} />}

      <div className="action-panel">
        <div className="action-panel-header">
          <p className="font-medium text-foreground">Admin actions</p>
          <p className="text-xs text-muted">Start the circle and enforce late payments</p>
        </div>
        <div className="action-panel-body space-y-4">
        {status === "Pending" && (
          <>
            <Step
              done={memberCount >= maxMembers}
              label={`All members joined (${memberCount}/${maxMembers})`}
              hint="Share the join link — every member including you must join"
            />
            <button
              disabled={!!loading || !canStart}
              onClick={() => run("Start", () => buildStartCircleOp(circleId))}
              className="btn-primary w-full"
            >
              {loading === "Start" ? "Starting…" : "Start circle"}
            </button>
            {!canStart && (
              <p className="text-xs text-muted">Wait until all slots are filled.</p>
            )}
            {canStart && (
              <p className="text-xs text-muted">
                Payout order will be shuffled on-chain when you start.
              </p>
            )}
          </>
        )}

        {status === "Active" && (
          <>
            <Step
              done={periodEnded && !recipientDefaulted && defaulters.length === 0}
              label="Recipient claims payout"
              hint={
                periodEnded
                  ? recipient
                    ? `${shortenAddress(recipient, 6)} claims on the circle page`
                    : "The scheduled recipient claims payout on the circle page"
                  : timeRemaining(nextPayoutTime)
              }
            />

            {defaulters.length > 0 && periodEnded && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-xs font-medium text-foreground">Slash late members</p>
                {defaulters.map((d) => (
                  <button
                    key={d.address}
                    disabled={!!loading || !canSlash}
                    onClick={() => run("Slash", () => buildSlashDefaulterOp(circleId, d.address))}
                    className="btn-danger w-full text-sm"
                  >
                    Slash {shortenAddress(d.address)}
                  </button>
                ))}
              </div>
            )}

            {recipientDefaulted && periodEnded && (
              <Alert variant="error">
                The scheduled recipient has not paid — slash their collateral first, then the next round can proceed.
              </Alert>
            )}

            {periodEnded && defaulters.length === 0 && !recipientDefaulted && recipient && (
              <Alert variant="info">
                Payout turn: <span className="font-mono">{shortenAddress(recipient, 6)}</span> — they
                claim on the circle page, not from here.
              </Alert>
            )}
            {!periodEnded && (
              <p className="text-xs text-muted">
                After the round period ends, the scheduled recipient clicks &quot;Claim payout&quot; on the circle page.
              </p>
            )}
          </>
        )}

        {status === "Completed" && (
          <Alert variant="success">Circle complete. Members can reclaim collateral on the circle page.</Alert>
        )}

        {error && <Alert variant="error">{error}</Alert>}
        {txHash && <TxResult hash={txHash} />}
        </div>
      </div>
    </div>
  );
}

function Step({ done, label, hint }: { done: boolean; label: string; hint: string }) {
  return (
    <div className="flex gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
          done ? "bg-foreground text-background" : "border border-border text-muted"
        }`}
      >
        {done ? "✓" : "·"}
      </span>
      <div>
        <p className={`text-sm ${done ? "text-muted line-through" : "text-foreground"}`}>{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
    </div>
  );
}
