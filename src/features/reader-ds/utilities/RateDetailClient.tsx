"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import type { HistoryApiResponse, HistoryRange } from "@/lib/verified-rates/types";

const RateHistoryGraph = dynamic(
  () =>
    import("@/features/reader-ds/utilities/RateHistoryGraph").then((m) => m.RateHistoryGraph),
  {
    ssr: false,
    loading: () => (
      <div style={{ minHeight: 120, padding: 12 }} aria-busy="true">
        ग्राफ लोड हो रहा है…
      </div>
    ),
  }
);

type Props = {
  initial: HistoryApiResponse;
  categoryLabel: string;
  unitLabel: string;
  citySlug?: string | null;
};

export function RateDetailClient({
  initial,
  categoryLabel,
  unitLabel,
  citySlug,
}: Props) {
  const [range, setRange] = useState<HistoryRange>(initial.range);
  const [payload, setPayload] = useState(initial);
  const [pending, startTransition] = useTransition();

  const queryBase = useMemo(() => {
    const sp = new URLSearchParams({
      category: initial.category,
      language: "hi",
    });
    if (citySlug) sp.set("city", citySlug);
    return sp;
  }, [citySlug, initial.category]);

  function onRangeChange(next: HistoryRange) {
    setRange(next);
    startTransition(async () => {
      try {
        const sp = new URLSearchParams(queryBase);
        sp.set("range", next);
        const res = await fetch(`/api/utilities/verified-rates/history?${sp.toString()}`);
        if (!res.ok) return;
        const json = (await res.json()) as HistoryApiResponse;
        if (json.points) setPayload(json);
      } catch {
        /* keep prior */
      }
    });
  }

  return (
    <div data-jd-rate-graph-shell aria-busy={pending}>
      <RateHistoryGraph
        points={payload.points}
        availableRanges={payload.availableRanges}
        activeRange={range}
        unitLabel={unitLabel}
        categoryLabel={categoryLabel}
        onRangeChange={onRangeChange}
      />
    </div>
  );
}
