import { FeatureCards } from "@/components/landing/FeatureCards";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { JoinCircleSection } from "@/components/landing/JoinCircleSection";

export function LandingHero() {
  return (
    <div className="space-y-16">
      <HeroSection />
      <FeatureCards />
      <HowItWorksSection />
      <JoinCircleSection />
    </div>
  );
}
