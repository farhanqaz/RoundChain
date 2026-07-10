/** Animated mini-scenes for the landing "How it works" steps. */
import type { ReactNode } from "react";

function IllusFrame({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? "illus-frame-feature" : "illus-frame-step"} aria-hidden>
      {children}
    </div>
  );
}

/** Step 1 — circle ring forms, center anchor appears */
export function CreateCircleIllus() {
  return (
    <IllusFrame>
      <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
        <circle
          cx="60"
          cy="60"
          r="34"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="8 6"
          className="text-foreground/30 illus-ring-draw"
        />
        <circle cx="60" cy="60" r="5" fill="currentColor" className="text-foreground illus-dot-pop" />
        <g className="text-muted">
          <circle cx="60" cy="26" r="3" fill="currentColor" className="illus-node illus-node-1" />
          <circle cx="89" cy="74" r="3" fill="currentColor" className="illus-node illus-node-2" />
          <circle cx="31" cy="74" r="3" fill="currentColor" className="illus-node illus-node-3" />
        </g>
      </svg>
    </IllusFrame>
  );
}

/** Step 2 — seats fill as members join */
export function InviteMembersIllus() {
  const seats = [0, 1, 2, 3];
  return (
    <IllusFrame>
      <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
        <path
          d="M38 52h44"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          className="text-foreground/25 illus-link-pulse"
        />
        <rect x="34" y="38" width="52" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-foreground/40" />
        <text x="60" y="45.5" textAnchor="middle" className="fill-current text-[7px] font-mono text-muted illus-link-text">
          /join/12
        </text>
        <g>
          {seats.map((i) => {
            const x = 28 + i * 20;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y="68"
                  width="16"
                  height="16"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className={`text-border illus-seat illus-seat-${i + 1}`}
                />
                <text
                  x={x + 8}
                  y="79"
                  textAnchor="middle"
                  className={`fill-current text-[8px] font-medium illus-seat-check illus-seat-${i + 1}`}
                >
                  ✓
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </IllusFrame>
  );
}

/** Step 3 — contributors pay into pot, recipient receives */
export function RunRoundsIllus() {
  return (
    <IllusFrame>
      <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
        <circle cx="60" cy="60" r="18" stroke="currentColor" strokeWidth="1.5" className="text-foreground/50" />
        <text x="60" y="63" textAnchor="middle" className="fill-current text-[8px] font-medium text-foreground">
          pot
        </text>
        <circle cx="28" cy="38" r="4" fill="currentColor" className="text-muted" />
        <circle cx="92" cy="38" r="4" fill="currentColor" className="text-muted" />
        <circle cx="60" cy="98" r="4" fill="currentColor" className="text-foreground illus-recipient-glow" />
        <path d="M32 42 L52 52" stroke="currentColor" strokeWidth="1.25" className="text-muted illus-flow illus-flow-1" />
        <path d="M88 42 L68 52" stroke="currentColor" strokeWidth="1.25" className="text-muted illus-flow illus-flow-2" />
        <path d="M60 78 L60 94" stroke="currentColor" strokeWidth="1.5" className="text-foreground illus-flow illus-flow-out" />
        <g className="illus-coin illus-coin-1">
          <circle cx="0" cy="0" r="2.5" fill="currentColor" className="text-foreground" />
        </g>
        <g className="illus-coin illus-coin-2">
          <circle cx="0" cy="0" r="2.5" fill="currentColor" className="text-foreground" />
        </g>
        <g className="illus-coin illus-coin-out">
          <circle cx="0" cy="0" r="3" fill="currentColor" className="text-foreground" />
        </g>
      </svg>
    </IllusFrame>
  );
}

/** Feature micro-scenes */
export function LockFeatureIllus() {
  return (
    <IllusFrame compact>
      <svg viewBox="0 0 80 80" className="h-full w-full" fill="none" stroke="currentColor">
        <rect x="22" y="38" width="36" height="28" rx="4" strokeWidth="2" className="text-foreground/70" />
        <path d="M30 38 V28 a10 10 0 0 1 20 0 v10" strokeWidth="2" strokeLinecap="round" className="text-foreground illus-lock-shackle" />
        <circle cx="40" cy="52" r="3" fill="currentColor" className="text-foreground illus-dot-pop" />
      </svg>
    </IllusFrame>
  );
}

export function TrustFeatureIllus() {
  return (
    <IllusFrame compact>
      <svg viewBox="0 0 80 80" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M40 14 L62 24 V38 c0 12-8 22-22 24-14-2-22-12-22-24 V24 Z" className="text-foreground/50" strokeLinejoin="round" />
        <path d="M30 40 L37 47 L52 32" strokeLinecap="round" strokeLinejoin="round" className="text-foreground illus-check-draw" />
        <text x="40" y="68" textAnchor="middle" className="fill-current text-[9px] font-mono text-muted illus-score-pop">
          +10
        </text>
      </svg>
    </IllusFrame>
  );
}

export function ShuffleFeatureIllus() {
  return (
    <IllusFrame compact>
      <svg viewBox="0 0 80 80" className="h-full w-full" fill="none">
        {[0, 1, 2].map((i) => (
          <g key={i} className={`illus-shuffle-card illus-shuffle-${i + 1}`}>
            <rect x={22 + i * 14} y={28 + (i % 2) * 6} width="18" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" className="text-foreground/60" />
            <text x={31 + i * 14} y={44 + (i % 2) * 6} textAnchor="middle" className="fill-current text-[9px] font-mono text-muted">
              {i + 1}
            </text>
          </g>
        ))}
        <path d="M20 62 H60" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-foreground/25 illus-ring-draw" />
      </svg>
    </IllusFrame>
  );
}
