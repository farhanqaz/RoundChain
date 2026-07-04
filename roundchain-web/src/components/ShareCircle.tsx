"use client";

import { joinInviteMessage, whatsAppShare } from "@/lib/setup";
import { CopyButton } from "@/components/CopyButton";

export function ShareCircle({ circleId }: { circleId: number }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/join/${circleId}`;
  const waLink = whatsAppShare(joinInviteMessage(circleId, origin));

  return (
    <div className="border border-border bg-card p-5">
      <p className="font-medium text-foreground">Invite members</p>
      <p className="mt-1 text-sm text-muted">
        Share this link with your circle group
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <code className="truncate rounded-md border border-border bg-muted-surface px-3 py-2.5 font-mono text-xs text-muted">
          {joinUrl || `/join/${circleId}`}
        </code>
        <div className="flex gap-2">
          <CopyButton text={joinUrl || `/join/${circleId}`} label="Copy link" />
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 py-2 text-center text-xs">
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
