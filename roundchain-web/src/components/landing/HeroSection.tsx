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
    <section className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
      <div className="space-y-7 lg:max-w-lg">
        <p className="section-label animate-fade-up">On-chain ROSCA · Stellar</p>
        <h1 className="text-balance animate-fade-up-delay-1 text-4xl font-medium leading-[1.12] tracking-tight text-foreground sm:text-[2.75rem] sm:leading-[1.08]">
          Savings circles with rules you can trust
        </h1>
        <p className="animate-fade-up-delay-2 max-w-md text-[15px] leading-7 text-muted sm:text-base">
          RoundChain runs rotating savings circles on Stellar Soroban — with on-chain financial
          reputation for people who have no traditional credit score.
        </p>
        <div className="animate-fade-up-delay-3 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
          <Link href="/create" className="btn-primary btn-lg">
            Create a circle
            <IconArrowRight aria-hidden />
          </Link>
          <Link href="/circles" className="btn-secondary btn-lg">
            Browse circles
          </Link>
        </div>
      </div>

      <aside className="demo-preview-card p-6 sm:p-7 lg:p-8" aria-labelledby="preview-circle-title">
        <p id="preview-circle-title" className="sr-only">
          Example active circle preview
        </p>
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <LogoMark size={LOGO_SIZE.card} animate />
            <div>
              <p className="stat-label">Preview</p>
              <p className="mt-0.5 font-medium text-foreground">Circle #12</p>
            </div>
          </div>
          <span className="pill-emerald landing-accent shrink-0">Active</span>
        </div>

        <div className="grid grid-cols-2 gap-6 border-b border-border pb-5">
          <div>
            <p className="stat-label">Contribution</p>
            <p className="stat-value mt-1.5">50 USDC</p>
            <p className="mt-0.5 text-xs text-muted">per round</p>
          </div>
          <div>
            <p className="stat-label">Circle size</p>
            <p className="mt-1.5 text-sm font-medium text-foreground">5 members</p>
            <p className="mt-0.5 text-xs text-muted">7-day period</p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          <div className="flex justify-between text-xs text-muted">
            <span>Round progress</span>
            <span className="tabular-nums">2 of 5</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill motion-safe:animate-progress w-2/5" />
          </div>
        </div>

        <div className="mt-6">
          <p className="stat-label mb-3">Members</p>
          <ul className="space-y-0">
            {DEMO_MEMBERS.map((m) => (
              <li
                key={m.name}
                className={`landing-row flex items-center justify-between gap-4 rounded-md border-t border-border py-3 text-sm first:border-t-0 first:pt-0 ${
                  m.highlight ? "bg-muted-surface/40 -mx-2 px-2" : "px-0.5"
                }`}
              >
                <span
                  className={`flex items-center gap-2 ${
                    m.highlight ? "font-medium text-foreground" : "text-muted"
                  }`}
                >
                  {m.highlight && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-hidden />
                  )}
                  {m.name}
                </span>
                <span
                  className={`shrink-0 text-xs tabular-nums ${
                    m.highlight ? "font-medium text-foreground" : "text-muted"
                  }`}
                >
                  {m.sub}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </section>
  );
}
