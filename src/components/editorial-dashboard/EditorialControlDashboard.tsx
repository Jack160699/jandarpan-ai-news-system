"use client";

import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";

type Props = {
  /** @deprecated Query-param keys removed — session cookies only */
  adminKey?: string;
};

/**
 * Legacy control surface — reads the shared AdminProvider dashboard cache
 * (no duplicate fetch / poll timers).
 */
export function EditorialControlDashboard(_props: Props) {
  const { data, error, loading, runAction } = useAdminNewsroom();

  if (loading) return <p>Loading editorial dashboard…</p>;
  if (error) return <p>{error}</p>;
  if (!data) return <p>No data</p>;

  return (
    <div>
      <p>Editorial snapshot loaded (shared cache).</p>
      <button
        type="button"
        onClick={() => void runAction("ping", {})}
      >
        Test action
      </button>
    </div>
  );
}
