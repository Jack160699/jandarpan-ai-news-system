"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import { EmptyState } from "@/design-system/components/EmptyState";

export type EmptyProps = {
  title?: string;
  description?: string;
  showHomeLink?: boolean;
};

export function Empty({
  title = "No live updates right now",
  description = "The newsroom is quiet. Breaking and developing stories will appear here as they happen.",
  showHomeLink = true,
}: EmptyProps) {
  return (
    <div className="lv3-empty">
      <EmptyState
        title={title}
        description={description}
        icon={<Radio size={28} aria-hidden />}
      />
      {showHomeLink ? (
        <Link href="/" className="lv3-empty__link tap-target">
          Back to homepage
        </Link>
      ) : null}
    </div>
  );
}
