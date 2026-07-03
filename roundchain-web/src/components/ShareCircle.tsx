"use client";

import { joinInviteMessage, whatsAppShare } from "@/lib/setup";
import { CopyButton } from "@/components/CopyButton";

export function ShareCircle({ circleId }: { circleId: number }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/join/${circleId}`;
  const waLink = whatsAppShare(joinInviteMessage(circleId, origin));

  return (
    <div className="card border-violet-700/20 bg-gradient-to-br from-violet-950/30 to-slate-900/40 p-5">
      <p className="font-semibold text-violet-100">Undang peserta</p>
      <p className="mt-1 text-sm text-slate-400">
        Kirim link ini ke grup WhatsApp arisan Anda
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <code className="truncate rounded-xl bg-slate-950/80 px-4 py-3 font-mono text-xs text-slate-300 ring-1 ring-slate-800">
          {joinUrl || `/join/${circleId}`}
        </code>
        <div className="flex gap-2">
          <CopyButton text={joinUrl || `/join/${circleId}`} label="Salin link" />
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-success flex-1 py-2 text-center text-xs">
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
