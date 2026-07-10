import type { ReactNode } from "react";

interface LandingSectionProps {
  id?: string;
  label: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function LandingSection({
  id,
  label,
  title,
  description,
  children,
  className = "",
}: LandingSectionProps) {
  const headingId = id ?? `${label.toLowerCase().replace(/\s+/g, "-")}-heading`;

  return (
    <section aria-labelledby={headingId} className={`landing-section ${className}`}>
      <div className="animate-fade-up">
        <p className="section-label">{label}</p>
        <h2 id={headingId} className="mt-2 text-xl font-medium text-foreground sm:text-2xl">
          {title}
        </h2>
        {description && <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}
