"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type {
  AffiliateUnit,
  MonetizationEventType,
  MonetizationPayload,
  NewsletterOffer,
  PlacementSlotId,
  PremiumReportTeaser,
  ReaderPlan,
  TenantMonetizationSettings,
} from "@/lib/monetization/types";
import { getPlacementForSlot } from "@/lib/monetization/placements";

type MonetizationContextValue = MonetizationPayload & {
  getSlot: (slotId: PlacementSlotId) => ReturnType<typeof getPlacementForSlot>;
  affiliatesForSlot: (slotId: string) => AffiliateUnit[];
  track: (
    eventType: MonetizationEventType,
    meta?: Record<string, string | number | undefined>
  ) => void;
};

const MonetizationContext = createContext<MonetizationContextValue | null>(
  null
);

export function MonetizationProvider({
  payload,
  children,
}: {
  payload: MonetizationPayload;
  children: ReactNode;
}) {
  const track = useCallback(
    (
      eventType: MonetizationEventType,
      meta?: Record<string, string | number | undefined>
    ) => {
      void fetch("/api/monetization/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          tenantSlug: payload.tenantSlug,
          ...meta,
        }),
        keepalive: true,
      }).catch(() => {});
    },
    [payload.tenantSlug]
  );

  const value = useMemo<MonetizationContextValue>(
    () => ({
      ...payload,
      getSlot: (slotId) => getPlacementForSlot(payload.settings, slotId),
      affiliatesForSlot: (slotId) =>
        payload.affiliates.filter((a) => a.slotId === slotId),
      track,
    }),
    [payload, track]
  );

  return (
    <MonetizationContext.Provider value={value}>
      {children}
    </MonetizationContext.Provider>
  );
}

export function useMonetization() {
  const ctx = useContext(MonetizationContext);
  if (!ctx) {
    throw new Error("useMonetization must be used within MonetizationProvider");
  }
  return ctx;
}

export function useMonetizationOptional() {
  return useContext(MonetizationContext);
}

export function useMonetizationSettings(): TenantMonetizationSettings | null {
  return useContext(MonetizationContext)?.settings ?? null;
}

export type { ReaderPlan, NewsletterOffer, PremiumReportTeaser };
