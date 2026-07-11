"use client";

import { useEffect, useState } from "react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { IntelligenceDeepLinkNav } from "@/components/admin-newsroom/IntelligenceDeepLinkNav";
import { buildInsightDeepLinksForRanked } from "@/lib/admin/intelligence-deep-links";
import { parseLiveWireDeskFilters } from "@/lib/admin/admin-desk-query";
import { QueueTable } from "@/components/admin-newsroom/ui/QueueTable";

export function LiveWirePanel() {
  const { data, loading, error } = useAdminNewsroom();
  const [focusEvent, setFocusEvent] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const { event } = parseLiveWireDeskFilters(
      new URLSearchParams(window.location.search)
    );
    if (event?.trim()) setFocusEvent(event.trim());
  }, []);

  if (loading && !data) {
    return <div className="anr-skeleton" style={{ height: "16rem" }} />;
  }
  if (!data) return null;

  return (
    <>
      {error ? <p className="anr-error">{error}</p> : null}
      <AdminCard title="Event clusters (live wire feed)">
        <QueueTable>
          <table className="anr-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Region</th>
                <th>Urgency</th>
                <th>Sources</th>
                <th>Signals</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.eventClusters.map((event) => {
                const isFocused =
                  focusEvent != null &&
                  (event.id === focusEvent ||
                    event.canonical_title
                      .toLowerCase()
                      .includes(focusEvent.toLowerCase()));
                return (
                <tr
                  key={event.id}
                  className={isFocused ? "anr-desk-row--focused" : undefined}
                >
                  <td style={{ maxWidth: "20rem" }}>
                    <div>{event.canonical_title}</div>
                    <IntelligenceDeepLinkNav
                      links={buildInsightDeepLinksForRanked("Most active events", {
                        label: event.canonical_title,
                        count: Math.max(event.signal_count, 1),
                      })}
                      label={`Deep links for ${event.canonical_title}`}
                    />
                  </td>
                  <td>{event.region ?? "—"}</td>
                  <td>{Math.round(event.urgency_score * 100)}%</td>
                  <td>{event.source_count}</td>
                  <td>{event.signal_count}</td>
                  <td>
                    {new Date(event.created_at).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </QueueTable>
      </AdminCard>

      <AdminCard title="AI processing queue">
        <QueueTable>
          <table className="anr-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Status</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {data.aiQueue.map((q) => (
                <tr key={q.id}>
                  <td className="anr-meta">{q.article_id}</td>
                  <td>{q.status}</td>
                  <td>{q.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </QueueTable>
      </AdminCard>
    </>
  );
}
