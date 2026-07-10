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
      <div className="how-steps-wrap">
        <div className="how-steps-flow" aria-hidden>
          <span className="how-steps-flow__line" />
          <span className="how-steps-flow__pulse" />
        </div>

        <ol className="how-steps-list">
          {STEPS.map((step, i) => (
            <li
              key={step.n}
              className={`how-step-item stagger-item stagger-${i + 1} group`}
            >
              <div className="how-step-illus landing-frame">
                <step.Illustration />
              </div>
              <span className="how-step-num landing-accent font-mono text-xs text-muted">
                {step.n}
              </span>
              <h3 className="landing-accent mt-2.5 text-[15px] font-medium leading-snug text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-10 text-sm leading-relaxed text-muted">
        Platform fee on each payout release:{" "}
        <PlatformFeeNote className="landing-accent text-foreground transition-colors duration-300 hover:opacity-80" suffix=" (on-chain)" />
      </p>
    </LandingSection>
  );
}
