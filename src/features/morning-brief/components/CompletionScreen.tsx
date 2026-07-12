"use client";

import Link from "next/link";
import { CheckCircle2, Home, RotateCcw } from "lucide-react";
import { buttonVariants } from "@/design-system/components/Button";
import { cn } from "@/design-system/utils/cn";
import { BriefCard } from "./BriefCard";

export type CompletionScreenProps = {
  onRestart?: () => void;
  homeHref?: string;
};

export function CompletionScreen({
  onRestart,
  homeHref = "/",
}: CompletionScreenProps) {
  return (
    <BriefCard
      id="mb-complete"
      tone="accent"
      className="mb-complete"
      aria-labelledby="mb-complete-title"
    >
      <div className="mb-complete__icon" aria-hidden>
        <CheckCircle2 size={40} />
      </div>
      <h2 id="mb-complete-title" className="mb-complete__title">
        You&apos;re caught up
      </h2>
      <p className="mb-complete__body">
        That&apos;s your morning brief for today. Check back this evening for the next
        digest, or explore more stories on the homepage.
      </p>
      <div className="mb-complete__actions">
        <Link href={homeHref} className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
          <Home size={18} aria-hidden />
          Back to Home
        </Link>
        {onRestart ? (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            onClick={onRestart}
          >
            <RotateCcw size={18} aria-hidden />
            Read again
          </button>
        ) : null}
      </div>
    </BriefCard>
  );
}
