import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { LOGO_SIZE } from "@/lib/logo-size";
import { LogoMark } from "@/components/LogoMark";

const DEMO_MEMBERS = [
  { name: "Ani S.", sub: "Payout turn", highlight: true },
  { name: "Budi R.", sub: "Paid", highlight: false },
  { name: "Citra W.", sub: "Waiting", highlight: false },
] as const;

export function HeroSection() {
  return (
    <section className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
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
            <IconArrowRight aria-hidden />
          </Link>
          <Link href="/circles" className="btn-secondary px-6 py-3">
            Browse circles
          </Link>
        </div>
      </div>

      <div
        className="demo-preview-card motion-safe:animate-float p-6 lg:p-8"
        aria-label="Example active circle preview"
        role="img"
      >
        <div className="mb-5 flex items-center justify-center">
          <LogoMark size={LOGO_SIZE.card} animate={false} />
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
              <div className="progress-fill motion-safe:animate-progress w-2/5" />
            </div>
          </div>
          <ul className="mt-6 divide-y divide-border">
            {DEMO_MEMBERS.map((m) => (
              <li
                key={m.name}
                className={`flex items-center justify-between py-3 transition-colors duration-300 first:pt-0 last:pb-0 ${
                  m.highlight
                    ? "-mx-2 rounded-md border-l-2 border-foreground bg-muted-surface/60 px-2"
                    : ""
                }`}
              >
                <span className={`text-sm ${m.highlight ? "font-medium text-foreground" : "text-muted"}`}>
                  {m.name}
                </span>
                <span className={`text-xs ${m.highlight ? "font-medium text-foreground" : "text-muted"}`}>
                  {m.highlight ? (
                    <span className="pill-emerald text-[10px] uppercase tracking-wide">Current</span>
                  ) : (
                    m.sub
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
