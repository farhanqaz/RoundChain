import { PlatformFeeNote } from "@/components/PlatformFeeNote";
import { LandingSection } from "@/components/landing/LandingSection";
import {
  CreateCircleIllus,
  InviteMembersIllus,
  RunRoundsIllus,
} from "@/components/landing/StepIllustrations";

const STEPS = [
  {
    n: "01",
    title: "Create a circle",
    desc: "Set members, contribution, and round length — you're enrolled and deposit collateral on create.",
    Illustration: CreateCircleIllus,
  },
  {
    n: "02",
    title: "Invite members",
    desc: "Share a link — others join and deposit collateral. The circle starts automatically when full.",
    Illustration: InviteMembersIllus,
  },
  {
    n: "03",
    title: "Run rounds",
    desc: "Contributors pay each period (recipient exempt on their turn). Anyone can release the pot when all obligated members paid.",
    Illustration: RunRoundsIllus,
  },
] as const;

export function HowItWorksSection() {
  return (
    <LandingSection
      id="how-it-works"
      label="How it works"
      title="From setup to payout"
      description="Three on-chain steps — no treasurer, no group-chat drama."
    >
      <ol className="grid list-none gap-10 p-0 lg:grid-cols-3 lg:gap-8">
        {STEPS.map((step, i) => (
          <li
            key={step.n}
            className={`how-step-item stagger-item stagger-${i + 1} group flex flex-col`}
          >
            <div className="mb-5 overflow-hidden rounded-md border border-border bg-card/80 backdrop-blur-sm transition-colors duration-300 group-hover:border-foreground/40">
              <step.Illustration />
            </div>
            <span className="font-mono text-xs text-muted transition-colors group-hover:text-foreground">
              {step.n}
            </span>
            <h3 className="mt-2 font-medium text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.desc}</p>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-sm text-muted">
        Platform fee on each payout release:{" "}
        <PlatformFeeNote className="text-foreground" suffix=" (on-chain)" />
      </p>
    </LandingSection>
  );
}
