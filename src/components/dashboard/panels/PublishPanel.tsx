"use client";

import { useMemo } from "react";
import { StoriesTable } from "@/components/admin-newsroom/StoriesTable";
import { useEditorialDesk } from "@/providers/EditorialDeskContext";

export function PublishPanel() {
  const { data } = useEditorialDesk();

  const pending = useMemo(
    () =>
      (data?.generatedArticles ?? []).filter(
        (a) => a.editorial_status === "pending" || !a.published_at
      ),
    [data?.generatedArticles]
  );

  return (
    <div className="anr-stack">
      <div className="anr-card">
        <h2 className="anr-card__title">Manual publishing queue</h2>
        <p className="anr-meta">
          {pending.length} stories awaiting approval or publish
        </p>
      </div>
      <StoriesTable articles={pending} />
    </div>
  );
}
