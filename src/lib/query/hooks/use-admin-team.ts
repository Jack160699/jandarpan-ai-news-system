"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import type { TeamActivity, TeamMember } from "@/lib/types/team";
import { tracePerf } from "@/lib/observability/performance-monitor";
import { queryKeys } from "@/lib/query/query-keys";

export type TeamRosterResponse = {
  ok: boolean;
  team?: TeamMember[];
  activity?: TeamActivity[];
  tenantName?: string;
  error?: string;
};

async function fetchTeamRoster(): Promise<TeamRosterResponse> {
  tracePerf("QUERY", "team_roster_fetch");
  const result = await apiClient.get<TeamRosterResponse>("/api/admin/team", {
    label: "admin_team",
    timeoutMs: 10_000,
  });
  if (!result.ok) {
    throw new Error(result.timedOut ? "timeout" : result.error);
  }
  return result.data;
}

export function useAdminTeamQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.team.roster,
    queryFn: fetchTeamRoster,
    enabled,
    staleTime: 30_000,
  });
}
