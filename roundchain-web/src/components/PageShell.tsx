"use client";

import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

/** Wraps page content with a subtle enter animation. */
export function PageShell({ children, className = "" }: Props) {
  return <div className={`animate-page-enter ${className}`.trim()}>{children}</div>;
}
