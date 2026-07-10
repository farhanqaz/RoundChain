import { LandingSection } from "@/components/landing/LandingSection";
import {
  LockFeatureIllus,
  ShuffleFeatureIllus,
  TrustFeatureIllus,
} from "@/components/landing/StepIllustrations";

const FEATURES = [
  {
    title: "Funds locked on-chain",
    desc: "Collateral is locked when you create or join. It returns after the circle completes or a clean exit.",
    Illustration: LockFeatureIllus,
  },
  {
    title: "On-chain trust score",
    desc: "Complete circles cleanly to build reputation. Creators can gate larger pools by minimum score.",
    Illustration: TrustFeatureIllus,
  },
  {
    title: "Fair payout order",
    desc: "Order is shuffled on-chain when the circle starts. Each round, n−1 members pay; the scheduled recipient is exempt.",
    Illustration: ShuffleFeatureIllus,
  },
] as const;

export function FeatureCards() {
  return (
    <LandingSection
      id="features"
      label="Why RoundChain"
      title="Built for trustless savings"
      description="Collateral, reputation, and fair order — enforced by smart contract, not group chat."
    >
      <div className="grid gap-3 md:grid-divider md:grid-cols-3">
        {FEATURES.map(({ title, desc, Illustration }, i) => (
          <div
            key={title}
            className={`grid-cell card-hover group stagger-item stagger-${i + 1} flex items-start gap-3.5 rounded-md border border-border p-4 md:flex-col md:gap-3 md:rounded-none md:border-0 md:p-5`}
          >
            <div className="shrink-0 overflow-hidden rounded-md border border-border bg-muted-surface/50 transition-colors duration-300 group-hover:border-foreground/30">
              <Illustration />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </LandingSection>
  );
}
