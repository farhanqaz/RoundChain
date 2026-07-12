"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { LandingSection } from "@/components/landing/LandingSection";

export function JoinCircleSection() {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [joinId, setJoinId] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  return (
    <LandingSection
      label="Member access"
      title="Join a circle"
      description="Enter the circle ID from your invite link."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const id = parseInt(joinId, 10);
          if (!id || id <= 0) {
            setJoinError("Enter a valid circle ID (positive number).");
            return;
          }
          setJoinError(null);
          router.push(`/join/${id}`);
        }}
        className="landing-surface w-full max-w-lg p-5 sm:p-6"
        noValidate
      >
        <label htmlFor={inputId} className="landing-accent block text-xs font-medium text-muted">
          Circle ID
        </label>
        <div className="join-form-row mt-1.5">
          <input
            id={inputId}
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="e.g. 12"
            value={joinId}
            onChange={(e) => {
              setJoinId(e.target.value);
              setJoinError(null);
            }}
            aria-invalid={joinError ? true : undefined}
            aria-describedby={joinError ? errorId : "join-hint"}
            className="input min-w-0 flex-1"
          />
          <button type="submit" disabled={!joinId.trim()} className="btn-primary shrink-0 px-5">
            Join circle
          </button>
        </div>
        {joinError ? (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-destructive">
            {joinError}
          </p>
        ) : (
          <p id="join-hint" className="landing-accent mt-1.5 text-xs text-muted">
            From an invite link like /join/12
          </p>
        )}
      </form>
    </LandingSection>
  );
}
