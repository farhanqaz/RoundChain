"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTRACT_ID } from "@/lib/constants";
import {
  CircleState,
  MemberDetail,
  getCircle,
  getMember,
  getMemberDetails,
  getTrustScore,
  TrustScore,
} from "@/lib/contract";

export interface CircleView {
  circle: CircleState;
  members: MemberDetail[];
  isMember: boolean;
  isCreator: boolean;
  /** @deprecated use isCreator */
  isAdmin: boolean;
  isSlashed: boolean;
  hasContributed: boolean;
  collateralClaimed: boolean;
  trustScore: TrustScore | null;
}

export function useCircle(circleId: number, address: string | null, pollMs = 15_000) {
  const [data, setData] = useState<CircleView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(
    async (silent = false) => {
      if (!CONTRACT_ID || isNaN(circleId)) {
        setError(isNaN(circleId) ? "Invalid circle ID" : "Contract not configured");
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const circle = await getCircle(circleId);
        const round = circle.status === "Active" ? circle.current_round : 0;
        const members = await getMemberDetails(circleId, round);

        let isMember = false;
        let hasContributed = false;
        let collateralClaimed = false;
        let isSlashed = false;
        let trustScore: TrustScore | null = null;

        if (address) {
          isMember = circle.payout_order.includes(address);
          try {
            trustScore = await getTrustScore(address);
          } catch {
            trustScore = null;
          }
          if (isMember) {
            const member = await getMember(circleId, address);
            hasContributed = member.contributions_paid > round;
            collateralClaimed = member.collateral_claimed;
            isSlashed = member.is_slashed;
          }
        }

        const isCreator = !!address && circle.creator === address;

        setData({
          circle,
          members,
          isMember,
          isCreator,
          isAdmin: isCreator,
          isSlashed,
          hasContributed,
          collateralClaimed,
          trustScore,
        });
        setError(null);
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load circle");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [circleId, address]
  );

  useEffect(() => {
    refresh();
    if (pollMs <= 0) return;
    const id = setInterval(() => refresh(true), pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { data, error, loading, refreshing, refresh };
}
