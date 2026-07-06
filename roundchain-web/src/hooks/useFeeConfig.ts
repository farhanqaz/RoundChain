"use client";

import { useEffect, useState } from "react";
import { getFeeConfig } from "@/lib/contract";
import { PLATFORM_FEE_BPS } from "@/lib/constants";

export function useFeeConfig() {
  const [feeBps, setFeeBps] = useState(PLATFORM_FEE_BPS);

  useEffect(() => {
    let cancelled = false;
    getFeeConfig()
      .then((cfg) => {
        if (!cancelled) setFeeBps(cfg.feeBps);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return feeBps;
}
