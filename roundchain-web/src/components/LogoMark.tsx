"use client";

interface Props {
  size?: number;
  className?: string;
  animate?: boolean;
}

/** RoundChain mark — center dot + dashed ring (matches brand logo). */
export function LogoMark({ size = 56, className = "", animate = true }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={`text-foreground ${className}`}
      aria-hidden
    >
      <circle cx="32" cy="32" r="6.5" fill="currentColor" className="logo-dot" />
      <g
        className={animate ? "logo-ring-spin" : undefined}
        style={{ transformOrigin: "32px 32px" }}
      >
        <circle
          cx="32"
          cy="32"
          r="24"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray="10.5 7.2"
          fill="none"
        />
      </g>
    </svg>
  );
}
