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
      <div className="animate-fade-up max-w-2xl">
        <p className="section-label">{label}</p>
        <h2
          id={headingId}
          className="mt-3 text-2xl font-medium tracking-tight text-foreground sm:text-[1.75rem] sm:leading-snug"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted">{description}</p>
        )}
      </div>
      <div className="mt-10">{children}</div>
    </section>
  );
}
