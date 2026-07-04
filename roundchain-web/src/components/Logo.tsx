"use client";

import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

interface Props {
  compact?: boolean;
  large?: boolean;
}

export function Logo({ compact = false, large = false }: Props) {
  const markSize = large ? 72 : compact ? 40 : 52;

  return (
    <Link
      href="/"
      className="group flex items-center gap-3 transition-opacity hover:opacity-80"
    >
      <LogoMark
        size={markSize}
        className="transition-transform duration-500 group-hover:scale-105"
      />
      {!compact && (
        <span className={`font-medium tracking-tight text-foreground ${large ? "text-2xl" : "text-lg"}`}>
          RoundChain
        </span>
      )}
    </Link>
  );
}
