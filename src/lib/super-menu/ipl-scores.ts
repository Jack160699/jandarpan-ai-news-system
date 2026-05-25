/**
 * IPL live scores — lightweight snapshot for super menu widget.
 * Uses CricAPI when CRICAPI_KEY is set; otherwise IST-aware demo fallback.
 */

import { getIplTeam, resolveIplTeamId, type IplTeamId } from "./ipl-teams";

export type IplMatchPhase = "live" | "upcoming" | "completed";

export type IplTeamScore = {
  teamId: IplTeamId;
  runs?: number;
  wickets?: number;
  overs?: number;
  logoUrl?: string;
};

export type IplMatch = {
  id: string;
  phase: IplMatchPhase;
  teamA: IplTeamScore;
  teamB: IplTeamScore;
  statusLine?: string;
  tossLine?: string;
  resultLine?: string;
  startAt: string;
  venue?: string;
};

export type IplWidgetCardKind = "live" | "upcoming" | "completed" | "next";

export type IplWidgetCard = {
  kind: IplWidgetCardKind;
  badgeEn: string;
  badgeHi: string;
  match: IplMatch;
};

export type IplScoresSnapshot = {
  updatedAt: string;
  source: "cricapi" | "fallback";
  matches: IplMatch[];
  cards: IplWidgetCard[];
};

const CACHE_TTL_MS = 3 * 60 * 1000;
const IST = "Asia/Kolkata";

let memoryCache: { snapshot: IplScoresSnapshot; expires: number } | null = null;

type CricApiMatch = {
  id?: string;
  name?: string;
  matchType?: string;
  status?: string;
  venue?: string;
  date?: string;
  dateTimeGMT?: string;
  teams?: string[];
  teamInfo?: { name?: string; shortname?: string; img?: string }[];
  score?: { r?: number; w?: number; o?: number; inning?: string }[];
};

function isIplMatch(name: string, teams: string[]): boolean {
  const blob = `${name} ${teams.join(" ")}`.toLowerCase();
  return (
    blob.includes("ipl") ||
    blob.includes("indian premier") ||
    (teams.length === 2 &&
      teams.every((t) => resolveIplTeamId(t) !== null) &&
      /t20|twenty/i.test(name))
  );
}

function parsePhase(status: string): IplMatchPhase {
  const s = status.toLowerCase();
  if (
    s.includes("live") ||
    s.includes("started") ||
    s.includes("innings") ||
    s.includes("stumps") ||
    s.includes("lunch") ||
    s.includes("tea") ||
    s.includes("drinks") ||
    s.includes("in progress")
  ) {
    return "live";
  }
  if (
    s.includes("won") ||
    s.includes("completed") ||
    s.includes("finished") ||
    s.includes("abandoned") ||
    s.includes("no result") ||
    s.includes("tied")
  ) {
    return "completed";
  }
  return "upcoming";
}

function teamFromName(
  name: string,
  teamInfo?: CricApiMatch["teamInfo"],
  score?: CricApiMatch["score"]
): IplTeamScore | null {
  const id = resolveIplTeamId(name);
  if (!id) return null;
  const info = teamInfo?.find(
    (t) => t.name === name || resolveIplTeamId(t.name ?? "") === id
  );
  const inning = score?.find((s) =>
    (s.inning ?? "").toLowerCase().includes(name.toLowerCase().split(" ")[0] ?? "")
  );
  const runs = inning?.r;
  const wickets = inning?.w;
  const overs = inning?.o;
  return {
    teamId: id,
    runs: runs ?? undefined,
    wickets: wickets ?? undefined,
    overs: overs ?? undefined,
    logoUrl: info?.img,
  };
}

function formatScoreLine(team: IplTeamScore): string {
  if (team.runs == null) return team.teamId;
  const w = team.wickets ?? 0;
  const o = team.overs != null ? ` (${team.overs})` : "";
  return `${team.teamId} ${team.runs}/${w}${o}`;
}

function formatSchedule(iso: string, lang: "en" | "hi"): string {
  const d = new Date(iso);
  const now = new Date();
  const fmtDate = new Intl.DateTimeFormat(lang === "en" ? "en-IN" : "hi-IN", {
    timeZone: IST,
    weekday: undefined,
    month: "short",
    day: "numeric",
  });
  const fmtTime = new Intl.DateTimeFormat(lang === "en" ? "en-IN" : "hi-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);

  let dayLabel =
    lang === "en"
      ? fmtDate.format(d)
      : fmtDate.format(d);
  if (dayKey === todayKey) dayLabel = lang === "en" ? "Today" : "आज";
  else if (dayKey === tomorrowKey) dayLabel = lang === "en" ? "Tomorrow" : "कल";

  return `${dayLabel} • ${fmtTime.format(d)}`;
}

export function buildWidgetCards(matches: IplMatch[]): IplWidgetCard[] {
  const live = matches.filter((m) => m.phase === "live");
  const upcoming = matches
    .filter((m) => m.phase === "upcoming")
    .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  const completed = matches
    .filter((m) => m.phase === "completed")
    .sort((a, b) => +new Date(b.startAt) - +new Date(a.startAt));

  const cards: IplWidgetCard[] = [];

  if (live.length > 0) {
    cards.push({
      kind: "live",
      badgeEn: "LIVE",
      badgeHi: "लाइव",
      match: live[0],
    });
    const next = upcoming[0];
    if (next) {
      cards.push({
        kind: "next",
        badgeEn: "NEXT MATCH",
        badgeHi: "अगला मैच",
        match: next,
      });
    }
    return cards.slice(0, 2);
  }

  if (completed.length > 0) {
    cards.push({
      kind: "completed",
      badgeEn: "COMPLETED",
      badgeHi: "पूर्ण",
      match: completed[0],
    });
    const next = upcoming[0];
    if (next) {
      cards.push({
        kind: "next",
        badgeEn: "NEXT MATCH",
        badgeHi: "अगला मैच",
        match: next,
      });
    }
    return cards.slice(0, 2);
  }

  for (const m of upcoming.slice(0, 2)) {
    cards.push({
      kind: "upcoming",
      badgeEn: "UPCOMING",
      badgeHi: "आगामी",
      match: m,
    });
  }

  return cards.slice(0, 2);
}

function mapCricApiMatch(raw: CricApiMatch): IplMatch | null {
  const teams = raw.teams ?? [];
  if (teams.length < 2 || !raw.name || !isIplMatch(raw.name, teams)) return null;

  const phase = parsePhase(raw.status ?? "");
  const teamA = teamFromName(teams[0], raw.teamInfo, raw.score);
  const teamB = teamFromName(teams[1], raw.teamInfo, raw.score);
  if (!teamA || !teamB) return null;

  const startAt =
    raw.dateTimeGMT && !raw.dateTimeGMT.endsWith("Z")
      ? `${raw.dateTimeGMT}Z`
      : raw.dateTimeGMT ?? new Date().toISOString();

  let statusLine = raw.status;
  let resultLine: string | undefined;
  if (phase === "completed") {
    resultLine = raw.status;
    statusLine = undefined;
  } else if (phase === "live" && raw.score && raw.score.length >= 2) {
    statusLine = `${formatScoreLine(teamA)} vs ${formatScoreLine(teamB)}`;
  }

  return {
    id: raw.id ?? raw.name,
    phase,
    teamA,
    teamB,
    statusLine: phase === "live" ? statusLine : undefined,
    resultLine,
    startAt,
    venue: raw.venue,
  };
}

async function fetchFromCricApi(): Promise<IplMatch[] | null> {
  const key = process.env.CRICAPI_KEY?.trim();
  if (!key) return null;

  try {
    const url = `https://api.cricapi.com/v1/currentMatches?apikey=${encodeURIComponent(key)}&offset=0`;
    const res = await fetch(url, {
      next: { revalidate: 180 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { status?: string; data?: CricApiMatch[] };
    if (json.status !== "success" || !Array.isArray(json.data)) return null;

    const matches = json.data
      .map(mapCricApiMatch)
      .filter((m): m is IplMatch => m !== null);

    return matches.length > 0 ? matches : null;
  } catch {
    return null;
  }
}

/** IST-aware demo data when live API unavailable */
export function buildFallbackIplScores(): IplScoresSnapshot {
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: IST,
      hour: "numeric",
      hour12: false,
    }).format(now)
  );

  const eveningSlot = hour >= 15 && hour < 23;
  const lateNight = hour >= 23 || hour < 2;

  const matches: IplMatch[] = [];

  if (eveningSlot && !lateNight) {
    const start = new Date(now);
    start.setHours(19, 30, 0, 0);
    matches.push({
      id: "demo-live-1",
      phase: "live",
      teamA: { teamId: "CSK", runs: 184, wickets: 4, overs: 18.2 },
      teamB: { teamId: "RCB", runs: 172, wickets: 7, overs: 20 },
      statusLine: "RCB need 13 runs in 10 balls",
      tossLine: "CSK won the toss · bat first",
      startAt: start.toISOString(),
      venue: "Chennai",
    });
    const nextStart = new Date(now);
    nextStart.setHours(nextStart.getHours() + 3);
    matches.push({
      id: "demo-up-1",
      phase: "upcoming",
      teamA: { teamId: "MI" },
      teamB: { teamId: "KKR" },
      startAt: nextStart.toISOString(),
      venue: "Mumbai",
    });
  } else if (lateNight) {
    matches.push({
      id: "demo-done-1",
      phase: "completed",
      teamA: { teamId: "GT" },
      teamB: { teamId: "RR" },
      resultLine: "GT won by 6 wickets",
      startAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    });
    const nextStart = new Date(now);
    nextStart.setDate(nextStart.getDate() + (hour >= 23 ? 1 : 0));
    nextStart.setHours(19, 30, 0, 0);
    matches.push({
      id: "demo-up-2",
      phase: "upcoming",
      teamA: { teamId: "CSK" },
      teamB: { teamId: "SRH" },
      startAt: nextStart.toISOString(),
      venue: "Hyderabad",
    });
  } else {
    const t1 = new Date(now);
    t1.setHours(19, 30, 0, 0);
    if (t1 < now) t1.setDate(t1.getDate() + 1);
    const t2 = new Date(t1);
    t2.setDate(t2.getDate() + 1);
    t2.setHours(15, 30, 0, 0);

    matches.push({
      id: "demo-up-a",
      phase: "upcoming",
      teamA: { teamId: "MI" },
      teamB: { teamId: "KKR" },
      startAt: t1.toISOString(),
    });
    matches.push({
      id: "demo-up-b",
      phase: "upcoming",
      teamA: { teamId: "GT" },
      teamB: { teamId: "RR" },
      startAt: t2.toISOString(),
    });
  }

  const snapshot: IplScoresSnapshot = {
    updatedAt: now.toISOString(),
    source: "fallback",
    matches,
    cards: buildWidgetCards(matches),
  };
  return snapshot;
}

export async function buildIplScoresSnapshot(): Promise<IplScoresSnapshot> {
  const apiMatches = await fetchFromCricApi();
  const now = new Date().toISOString();

  if (apiMatches && apiMatches.length > 0) {
    const snapshot: IplScoresSnapshot = {
      updatedAt: now,
      source: "cricapi",
      matches: apiMatches,
      cards: buildWidgetCards(apiMatches),
    };
    if (snapshot.cards.length === 0) {
      return buildFallbackIplScores();
    }
    return snapshot;
  }

  return buildFallbackIplScores();
}

export function getCachedIplScores(): IplScoresSnapshot {
  const now = Date.now();
  if (memoryCache && memoryCache.expires > now) {
    return memoryCache.snapshot;
  }
  const snapshot = buildFallbackIplScores();
  memoryCache = { snapshot, expires: now + CACHE_TTL_MS };
  return snapshot;
}

export async function refreshIplScoresCache(): Promise<IplScoresSnapshot> {
  const snapshot = await buildIplScoresSnapshot();
  memoryCache = { snapshot, expires: Date.now() + CACHE_TTL_MS };
  return snapshot;
}

export function formatMatchSchedule(
  iso: string,
  language: string
): string {
  const lang = language === "hi" ? "hi" : "en";
  return formatSchedule(iso, lang);
}

export function formatTeamScore(team: IplTeamScore): string {
  if (team.runs == null) return team.teamId;
  const w = team.wickets ?? 0;
  const overs = team.overs != null ? ` (${team.overs})` : "";
  return `${team.runs}/${w}${overs}`;
}

export function teamMeta(teamId: IplTeamId) {
  return getIplTeam(teamId);
}

export const IPL_SCORES_REVALIDATE_SEC = 180;
export const IPL_CLIENT_POLL_MS = 3 * 60 * 1000;
