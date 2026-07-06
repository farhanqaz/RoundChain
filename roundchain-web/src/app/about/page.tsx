"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { PlatformFeeNote } from "@/components/PlatformFeeNote";
import { IconLock, IconList, IconShield } from "@/components/icons";
import {
  CONTRACT_ID,
  EXPLORER_CONTRACT_URL,
  SOROBAN_RPC,
  USDC_TOKEN,
} from "@/lib/constants";
import { server } from "@/lib/contract";

const VALUES = [
  { icon: IconLock, title: "No middleman", desc: "Funds never pass through a human treasurer." },
  { icon: IconList, title: "Transparent rules", desc: "Every rule is recorded on-chain." },
  { icon: IconShield, title: "Auto enforcement", desc: "Late payments trigger slashing after the round period ends." },
];

const PROTOCOL_RULES = [
  "n−1 contributors pay each round; the scheduled recipient does not pay that round.",
  "Payout order is shuffled on-chain when the last member joins.",
  "Pot size matches active contributors — defaults do not inflate the payout.",
  "Min trust score applies to the creator and all joiners.",
  "Trust +10 after a clean completion; −25 immediately on slash.",
];

export default function AboutPage() {
  const [rpcOk, setRpcOk] = useState<boolean | null>(null);
  const [showDev, setShowDev] = useState(false);

  useEffect(() => {
    server.getHealth().then(() => setRpcOk(true)).catch(() => setRpcOk(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-12">
      <div>
        <p className="section-label">About</p>
        <h1 className="mt-2 text-3xl font-medium text-foreground">RoundChain</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          A digital ROSCA (rotating savings circle) that replaces blind trust with Stellar Soroban
          smart contracts. Collateral is locked on-chain, payout order is shuffled fairly, and late
          members are penalized automatically. A{" "}
          <PlatformFeeNote suffix=" platform fee" /> applies on each payout release (read from the
          contract). Complete circles to build an on-chain trust score.
        </p>
      </div>

      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
        {VALUES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-card p-4">
            <Icon className="mb-2 h-5 w-5 text-muted" />
            <p className="font-medium text-foreground">{title}</p>
            <p className="mt-1 text-xs text-muted">{desc}</p>
          </div>
        ))}
      </div>

      <div className="border border-border bg-card p-6">
        <h2 className="font-medium text-foreground">Protocol rules</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          {PROTOCOL_RULES.map((rule) => (
            <li key={rule} className="flex gap-2">
              <span className="text-muted">·</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border border-border bg-card p-6">
        <p className="text-sm text-muted">Network status</p>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${rpcOk === true ? "bg-foreground" : rpcOk === false ? "bg-muted" : "bg-border"}`}
          />
          <span className="text-sm text-muted">
            Soroban Testnet {rpcOk === true ? "online" : rpcOk === false ? "offline" : "checking…"}
          </span>
        </div>
      </div>

      <div className="border border-border bg-card p-6">
        <h2 className="font-medium text-foreground">Get started</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted">
          <li className="flex gap-3">
            <span className="font-mono text-xs text-muted">1</span>
            <span>
              <Link href="/demo" className="text-foreground underline underline-offset-2">
                Try the sandbox
              </Link>{" "}
              or{" "}
              <Link href="/create" className="text-foreground underline underline-offset-2">
                create a circle
              </Link>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-muted">2</span>
            <span>Invite members via link — circle starts automatically when full</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-muted">3</span>
            <span>
              Contributors pay each round → anyone releases payout when obligated members paid (
              <PlatformFeeNote suffix=" fee" />)
            </span>
          </li>
        </ol>
      </div>

      <div className="border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDev(!showDev)}
          className="flex w-full items-center justify-between px-6 py-4 text-left text-sm text-muted hover:bg-muted-surface"
        >
          <span>Technical details</span>
          <span className="text-muted">{showDev ? "−" : "+"}</span>
        </button>
        {showDev && (
          <div className="space-y-4 border-t border-border px-6 py-5">
            {[
              { label: "RoundChain contract", value: CONTRACT_ID },
              { label: "USDC (Circle testnet)", value: USDC_TOKEN },
              { label: "Soroban RPC", value: SOROBAN_RPC },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-muted">{item.label}</p>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 truncate rounded-md border border-border bg-muted-surface px-3 py-2 font-mono text-xs text-muted">
                    {item.value || "—"}
                  </code>
                  {item.value && (
                    <div className="flex gap-2">
                      <CopyButton text={item.value} />
                      {item.label !== "Soroban RPC" && (
                        <a
                          href={`${EXPLORER_CONTRACT_URL}/${item.value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost py-2 text-xs"
                        >
                          Explorer
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
