"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconArrowRight, IconList, IconLock, IconShield } from "@/components/icons";
import { PlatformFeeNote } from "@/components/PlatformFeeNote";
import { LogoMark } from "@/components/LogoMark";

const FEATURES = [
  {
    icon: IconLock,
    title: "Funds locked on-chain",
    desc: "Collateral is locked when you create or join. It returns after the circle completes or a clean exit.",
  },
  {
    icon: IconShield,
    title: "On-chain trust score",
    desc: "Complete circles cleanly to build reputation. Creators can gate larger pools by minimum score.",
  },
  {
    icon: IconList,
    title: "Fair payout order",
    desc: "Order is shuffled on-chain when the circle starts. Each round, n−1 members pay; the scheduled recipient is exempt.",
  },
];

const STEPS = [
  { n: "01", title: "Create a circle", desc: "Set members, contribution, and round length — you're enrolled and deposit collateral on create." },
  { n: "02", title: "Invite members", desc: "Share a link — others join and deposit collateral. The circle starts automatically when full." },
  { n: "03", title: "Run rounds", desc: "Contributors pay each period (recipient exempt on their turn). Anyone can release the pot when all obligated members paid." },
];

const DEMO_MEMBERS = [
  { name: "Ani S.", sub: "Payout turn", highlight: true },
  { name: "Budi R.", sub: "Paid", highlight: false },
  { name: "Citra W.", sub: "Waiting", highlight: false },
];

export function LandingHero() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [hoverCard, setHoverCard] = useState(false);

  return (
    <div className="space-y-20">
      <section className="grid gap-12 pt-4 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="space-y-6">
          <p className="section-label animate-fade-up">On-chain ROSCA · Stellar</p>
          <h1 className="text-balance animate-fade-up-delay-1 text-4xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Savings circles with rules you can trust
          </h1>
          <p className="animate-fade-up-delay-2 max-w-md text-base leading-relaxed text-muted">
            RoundChain runs rotating savings circles on Stellar Soroban — with on-chain financial
            reputation for people who have no traditional credit score.
          </p>
          <div className="animate-fade-up-delay-3 flex flex-col gap-3 pt-2 sm:flex-row">
            <Link href="/create" className="btn-primary px-6 py-3">
              Create a circle
              <IconArrowRight />
            </Link>
            <Link href="/circles" className="btn-secondary px-6 py-3">
              Browse circles
            </Link>
          </div>
        </div>

        <div
          className="interactive-card animate-float p-6 lg:p-8"
          onMouseEnter={() => setHoverCard(true)}
          onMouseLeave={() => setHoverCard(false)}
        >
          <div className="mb-6 flex items-center justify-center">
            <LogoMark size={hoverCard ? 88 : 80} className="transition-all duration-500" />
          </div>
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="text-xs text-muted">Circle #12</span>
            <span className="pill-emerald">Active</span>
          </div>
          <div className="pt-4">
            <p className="stat-value">50 USDC / round</p>
            <p className="mt-1 text-xs text-muted">5 members · 7-day period</p>
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs text-muted">
                <span>Progress</span>
                <span>Round 2 of 5</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill animate-progress w-2/5" />
              </div>
            </div>
            <ul className="mt-6 divide-y divide-border">
              {DEMO_MEMBERS.map((m) => (
                <li
                  key={m.name}
                  className={`flex items-center justify-between py-3 transition-colors duration-300 first:pt-0 last:pb-0 ${
                    m.highlight ? "font-medium" : ""
                  }`}
                >
                  <span className={`text-sm ${m.highlight ? "text-foreground" : "text-muted"}`}>
                    {m.name}
                  </span>
                  <span className="text-xs text-muted">{m.sub}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="animate-fade-up border-t border-border pt-12">
        <div className="grid gap-6 lg:grid-cols-[1fr,auto] lg:items-end">
          <div>
            <p className="section-label">Member access</p>
            <h2 className="mt-2 text-lg font-medium text-foreground">Join a circle</h2>
            <p className="mt-1 text-sm text-muted">Enter the circle ID from your invite link</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const id = parseInt(joinId, 10);
              if (!id || id <= 0) {
                setJoinError("Invalid circle ID");
                return;
              }
              setJoinError(null);
              router.push(`/join/${id}`);
            }}
            className="flex flex-col gap-2 sm:flex-row lg:min-w-[320px]"
          >
            <input
              type="number"
              min="1"
              placeholder="Circle ID"
              value={joinId}
              onChange={(e) => {
                setJoinId(e.target.value);
                setJoinError(null);
              }}
              className="input flex-1"
            />
            <button type="submit" disabled={!joinId} className="btn-primary shrink-0 px-6">
              Go
            </button>
          </form>
        </div>
        {joinError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{joinError}</p>}
      </section>

      <section className="grid-divider sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
          <div
            key={title}
            className="grid-cell card-hover group"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <Icon className="mb-4 h-5 w-5 text-muted transition-transform duration-300 group-hover:scale-110 group-hover:text-foreground" />
            <h3 className="font-medium text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
          </div>
        ))}
      </section>

      <section className="space-y-8 border-t border-border pt-12">
        <div>
          <p className="section-label">How it works</p>
          <h2 className="mt-2 text-xl font-medium text-foreground">From setup to payout</h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className="group transition-transform duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <span className="font-mono text-xs text-muted transition-colors group-hover:text-foreground">
                {step.n}
              </span>
              <h3 className="mt-2 font-medium text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">
          Platform fee on each payout release:{" "}
          <PlatformFeeNote className="text-foreground" suffix=" (on-chain)" />
        </p>
      </section>
    </div>
  );
}
