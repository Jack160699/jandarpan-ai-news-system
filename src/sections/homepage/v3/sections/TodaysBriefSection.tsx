"use client";

import Link from "next/link";
import { Headphones } from "lucide-react";
import { buttonVariants } from "@/design-system/components/Button";
import { cn } from "@/design-system/utils/cn";
import { AISummary } from "@/design-system/components/AISummary";
import { Badge } from "@/design-system/components/Badge";
import { isMorningBriefEnabled } from "@/lib/morning-brief/config";
import type { useHomeV3Data } from "../hooks/useHomeV3Data";

type TodaysBriefSectionProps = {
  brief: ReturnType<typeof useHomeV3Data>["brief"];
};

export function TodaysBriefSection({ brief }: TodaysBriefSectionProps) {
  const morningBriefEnabled = isMorningBriefEnabled();
  const readBriefHref = morningBriefEnabled ? "/morning-brief" : "/search?q=brief";
  const listenHref =
    brief.listenArticleIds.length > 0
      ? `/listen?ids=${brief.listenArticleIds.slice(0, 5).join(",")}`
      : "/listen";

  return (
    <section className="home-v3__section home-v3__enter" aria-labelledby="home-v3-brief-title">
      <div className="home-v3-brief">
        <div>
          <Badge variant="brand">Today&apos;s Brief</Badge>
          <h2 id="home-v3-brief-title" className="sr-only">
            Today&apos;s Brief
          </h2>
        </div>

        <div className="home-v3-brief__stats">
          <span className="home-v3-brief__stat">
            {brief.breakingCount} breaking
          </span>
          <span className="home-v3-brief__stat">
            {brief.storyCount} stories today
          </span>
        </div>

        {brief.summary ? (
          <AISummary summary={brief.summary} label="Editor's AI Summary" />
        ) : null}

        <div className="home-v3-brief__actions">
          <Link
            href={readBriefHref}
            className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
          >
            Read Brief
          </Link>
          <Link
            href={listenHref}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            <Headphones size={18} aria-hidden />
            Listen
          </Link>
        </div>
      </div>
    </section>
  );
}
