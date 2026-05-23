"use client";

import { StoriesTable } from "@/components/admin-newsroom/StoriesTable";
import { useEditorialDesk } from "@/providers/EditorialDeskContext";

export function EditorialPanel() {
  const { data } = useEditorialDesk();
  const clusters = data?.eventClusters?.slice(0, 8) ?? [];

  return (
    <>
      <div className="anr-card" style={{ marginBottom: "1rem" }}>
        <h2 className="anr-card__title">Live wire · event clusters</h2>
        <ul className="saas-audit-list">
          {clusters.map((e) => (
            <li key={e.id}>
              {e.canonical_title} · urgency {e.urgency_score} · {e.source_count}{" "}
              sources
            </li>
          ))}
          {!clusters.length ? (
            <li className="anr-meta">No active clusters</li>
          ) : null}
        </ul>
      </div>
      <StoriesTable />
    </>
  );
}
