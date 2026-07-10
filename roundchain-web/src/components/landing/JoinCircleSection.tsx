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
        className="flex max-w-md flex-col gap-3 sm:flex-row sm:items-start"
        noValidate
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor={inputId} className="sr-only">
            Circle ID
          </label>
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
            aria-describedby={joinError ? errorId : undefined}
            className="input w-full"
          />
          {joinError && (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {joinError}
            </p>
          )}
        </div>
        <button type="submit" disabled={!joinId.trim()} className="btn-primary shrink-0 px-6">
          Go to circle
        </button>
      </form>
    </LandingSection>
  );
}
