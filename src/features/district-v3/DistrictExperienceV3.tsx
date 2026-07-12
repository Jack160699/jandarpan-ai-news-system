"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { ErrorState } from "@/design-system/components/ErrorState";
import { PageContainer } from "@/layouts/PageContainer";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import { useDistrictV3Data } from "./hooks/useDistrictV3Data";
import { DistrictHome } from "./components/DistrictHome";
import { Loading } from "./components/Loading";
import { DistrictV3Skeleton } from "./skeletons";
import type { DistrictExperienceV3Props } from "./types";
import "./styles/district-v3.css";

/**
 * JDP-012 — District Experience V3
 * My District hub using JDP-001 design system and JDP-002 layout primitives.
 */
export function DistrictExperienceV3({
  district,
  articles,
  data: dataOverride,
  simulateLoadMs = 0,
}: DistrictExperienceV3Props) {
  const data = useDistrictV3Data({
    slug: district.slug,
    name: district.name,
    data: dataOverride,
  });

  const [phase, setPhase] = useState<"loading" | "ready" | "error">(
    simulateLoadMs > 0 ? "loading" : "ready"
  );
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (simulateLoadMs <= 0) return undefined;
    const timer = window.setTimeout(() => setPhase("ready"), simulateLoadMs);
    return () => window.clearTimeout(timer);
  }, [simulateLoadMs, sessionKey]);

  const retry = useCallback(() => {
    setPhase("loading");
    setSessionKey((k) => k + 1);
    window.setTimeout(() => setPhase("ready"), 400);
  }, []);

  if (phase === "loading") {
    return (
      <PageContainer width="default" className="dv3-page">
        <Loading />
        <DistrictV3Skeleton />
      </PageContainer>
    );
  }

  if (phase === "error") {
    return (
      <PageContainer width="default" className="dv3-page">
        <ErrorState
          title="Couldn't load your district"
          description="Something went wrong loading district content. Please try again."
          actions={
            <Button variant="primary" onClick={retry}>
              Try again
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="default" className="dv3-page" key={sessionKey}>
      <HomeSectionErrorBoundary
        name="dv3-home"
        fallback={
          <ErrorState
            title="District page unavailable"
            description="We couldn't render your district hub. Please refresh the page."
            actions={
              <Button variant="primary" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            }
          />
        }
      >
        <DistrictHome district={district} articles={articles} data={data} />
      </HomeSectionErrorBoundary>
    </PageContainer>
  );
}
