"use client";

import { formatUsdc, MemberDetail, shortenAddress } from "@/lib/contract";
import { contributingMembers, scheduledRecipient } from "@/lib/circle-logic";

interface Props {
  members: MemberDetail[];
  payoutOrder: string[];
  currentRound: number;
  netPot: bigint;
  contributionAmount: bigint;
}

/** Mini diagram: contributors → pot → scheduled recipient */
export function CircleFlowViz({
  members,
  payoutOrder,
  currentRound,
  netPot,
  contributionAmount,
}: Props) {
  const recipient = scheduledRecipient(payoutOrder, currentRound);
  const contributors = contributingMembers(members, payoutOrder, currentRound);
  const paidCount = contributors.filter((m) => m.paid).length;

  return (
    <div className="flow-viz rounded-md border border-border bg-muted-surface/50 p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">This round</p>
      <div className="mt-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap gap-2">
          {contributors.map((m) => (
            <div
              key={m.address}
              className={`flow-node flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono ${
                m.paid
                  ? "border-foreground/30 bg-card text-foreground"
                  : "border-border text-muted"
              }`}
              title={m.paid ? "Paid" : "Unpaid"}
            >
              <span
                className={`flow-dot h-1.5 w-1.5 shrink-0 rounded-full ${
                  m.paid ? "bg-foreground animate-pulse-soft" : "bg-border"
                }`}
              />
              {shortenAddress(m.address, 3)}
            </div>
          ))}
        </div>

        <div className="flow-arrow hidden shrink-0 text-muted sm:block" aria-hidden>
          →
        </div>

        <div className="flow-pot shrink-0 rounded-md border border-foreground/20 bg-card px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted">Pot</p>
          <p className="stat-value mt-0.5 text-base">{formatUsdc(netPot)}</p>
          <p className="text-[10px] text-muted">USDC net</p>
        </div>

        <div className="flow-arrow hidden shrink-0 text-muted sm:block" aria-hidden>
          →
        </div>

        <div
          className={`flow-recipient shrink-0 rounded-md border px-4 py-3 ${
            recipient ? "border-foreground bg-card" : "border-border"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wide text-muted">Recipient</p>
          <p className="mt-0.5 font-mono text-sm text-foreground">
            {recipient ? shortenAddress(recipient, 6) : "—"}
          </p>
          <p className="mt-1 text-[10px] text-muted">
            {paidCount}/{contributors.length} paid · {formatUsdc(contributionAmount)}/each
          </p>
        </div>
      </div>
    </div>
  );
}
