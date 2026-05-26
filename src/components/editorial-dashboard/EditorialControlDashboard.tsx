"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";

type Props = {
  /** @deprecated Query-param keys removed — session cookies only */
  adminKey?: string;
};

export function EditorialControlDashboard(_props: Props) {
  const [data, setData] = useState<EditorialDashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/editorial/dashboard", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load");
        return;
      }
      setData(json as EditorialDashboardSnapshot);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function runAction(
    action: string,
    payload: Record<string, string | undefined>
  ) {
    const res = await fetch("/api/editorial/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, ...payload }),
    });
    const json = await res.json();
    if (json.ok) await refresh();
    return json.ok as boolean;
  }

  if (loading) return <p>Loading editorial dashboard…</p>;
  if (error) return <p>{error}</p>;
  if (!data) return <p>No data</p>;

  return (
    <div>
      <p>Articles in queue: {data.generatedArticles?.length ?? 0}</p>
      <p className="text-sm text-neutral-500">
        Use /admin/editorial for the full newsroom console.
      </p>
    </div>
  );
}
