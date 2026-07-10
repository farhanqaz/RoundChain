"use client";

import { useCallback, useEffect, useState } from "react";
import { isScheduledRecipient, roundObligationMet } from "@/lib/circle-logic";
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
  hasReceivedPayout: boolean;
  isExitedClean: boolean;
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
        const members = await getMemberDetails(circleId, round, circle.payout_order);

        let isMember = false;
        let hasContributed = false;
        let collateralClaimed = false;
        let isSlashed = false;
        let hasReceivedPayout = false;
        let isExitedClean = false;
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
            collateralClaimed = member.collateral_claimed;
            isSlashed = member.is_slashed;
            hasReceivedPayout = member.has_received_payout;
            isExitedClean = member.is_exited_clean;
            const selfRow = members.find((m) => m.address === address);
            hasContributed =
              selfRow != null
                ? roundObligationMet(selfRow, circle.payout_order, round) &&
                  !isScheduledRecipient(address, circle.payout_order, round)
                : member.contributions_paid > round;
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
          hasReceivedPayout,
          isExitedClean,
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
