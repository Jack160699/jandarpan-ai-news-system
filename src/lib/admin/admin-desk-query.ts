/**
 * Admin desk query parameters — shared URL builders for intelligence deep links.
 * Pure URL generation; no I/O.
 */

export const ADMIN_DESK_PARAMS = {
  category: "category",
  district: "district",
  event: "event",
  tag: "tag",
  q: "q",
  status: "status",
  breaking: "breaking",
} as const;

export type AdminEditorialDeskQuery = {
  category?: string | null;
  district?: string | null;
  event?: string | null;
  tag?: string | null;
  q?: string | null;
  status?: string | null;
  breaking?: boolean | null;
};

export type AdminWorkflowDeskQuery = {
  status?: string | null;
};

export type AdminLiveWireDeskQuery = {
  event?: string | null;
};

export type AdminStoriesDeskQuery = {
  tag?: string | null;
  q?: string | null;
  category?: string | null;
  district?: string | null;
  event?: string | null;
  status?: string | null;
  breaking?: boolean | null;
};

function appendParams(
  basePath: string,
  params: Record<string, string | null | undefined>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const trimmed = value?.trim();
    if (trimmed) search.set(key, trimmed);
  }
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function buildEditorialDeskHref(query: AdminEditorialDeskQuery = {}): string {
  return appendParams("/admin/editorial", {
    [ADMIN_DESK_PARAMS.category]: query.category,
    [ADMIN_DESK_PARAMS.district]: query.district,
    [ADMIN_DESK_PARAMS.event]: query.event,
    [ADMIN_DESK_PARAMS.tag]: query.tag,
    [ADMIN_DESK_PARAMS.q]: query.q,
    [ADMIN_DESK_PARAMS.status]: query.status,
    [ADMIN_DESK_PARAMS.breaking]:
      query.breaking === true ? "true" : query.breaking === false ? "false" : null,
  });
}

export function buildWorkflowDeskHref(query: AdminWorkflowDeskQuery = {}): string {
  return appendParams("/admin/workflow", {
    [ADMIN_DESK_PARAMS.status]: query.status,
  });
}

export function buildLiveWireDeskHref(query: AdminLiveWireDeskQuery = {}): string {
  return appendParams("/admin/live-wire", {
    [ADMIN_DESK_PARAMS.event]: query.event,
  });
}

export function buildStoriesDeskHref(query: AdminStoriesDeskQuery = {}): string {
  return appendParams("/admin/stories", {
    [ADMIN_DESK_PARAMS.tag]: query.tag,
    [ADMIN_DESK_PARAMS.q]: query.q,
    [ADMIN_DESK_PARAMS.category]: query.category,
    [ADMIN_DESK_PARAMS.district]: query.district,
    [ADMIN_DESK_PARAMS.event]: query.event,
    [ADMIN_DESK_PARAMS.status]: query.status,
    [ADMIN_DESK_PARAMS.breaking]:
      query.breaking === true ? "true" : query.breaking === false ? "false" : null,
  });
}

/** Public newsroom search — nearest destination when no admin search route exists. */
export function buildNewsroomSearchHref(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "/search";
  return `/search?q=${encodeURIComponent(trimmed)}`;
}

export function parseAdminDeskFilters(
  params: URLSearchParams
): AdminEditorialDeskQuery & AdminStoriesDeskQuery {
  const breaking = params.get(ADMIN_DESK_PARAMS.breaking);
  return {
    category: params.get(ADMIN_DESK_PARAMS.category),
    district: params.get(ADMIN_DESK_PARAMS.district),
    event: params.get(ADMIN_DESK_PARAMS.event),
    tag: params.get(ADMIN_DESK_PARAMS.tag),
    q: params.get(ADMIN_DESK_PARAMS.q),
    status: params.get(ADMIN_DESK_PARAMS.status),
    breaking:
      breaking === "true" ? true : breaking === "false" ? false : null,
  };
}

export function parseWorkflowDeskFilters(
  params: URLSearchParams
): AdminWorkflowDeskQuery {
  return {
    status: params.get(ADMIN_DESK_PARAMS.status),
  };
}

export function parseLiveWireDeskFilters(
  params: URLSearchParams
): AdminLiveWireDeskQuery {
  return {
    event: params.get(ADMIN_DESK_PARAMS.event),
  };
}
