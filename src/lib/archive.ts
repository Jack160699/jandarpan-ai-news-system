export type ArchiveEntry = {
  id: string;
  year: number;
  era: string;
  title: string;
  desk: string;
  slug?: string;
  kind: "investigation" | "dispatch" | "essay" | "ledger";
  note?: string;
};

export const ARCHIVE_TIMELINE: ArchiveEntry[] = [
  {
    id: "2026-naya-raipur",
    year: 2026,
    era: "Present filing",
    title: "When the Naya Raipur file went missing",
    desk: "Investigations",
    slug: "naya-raipur-file",
    kind: "investigation",
    note: "Ongoing · Part III entered this week",
  },
  {
    id: "2026-school",
    year: 2026,
    era: "Present filing",
    title: "The school beside the highway",
    desk: "Education",
    slug: "school-on-the-highway",
    kind: "essay",
  },
  {
    id: "2025-coal",
    year: 2025,
    era: "State record",
    title: "Coal valuation · Assembly series",
    desk: "Politics",
    slug: "coal-auction-transparency",
    kind: "investigation",
    note: "Thread origin · 6 prior filings",
  },
  {
    id: "2024-bastar",
    year: 2024,
    era: "Regional record",
    title: "Bastar mobile clinic routes",
    desk: "State Desk",
    slug: "bastar-health-camp",
    kind: "dispatch",
  },
  {
    id: "2019-folk",
    year: 2019,
    era: "Cultural memory",
    title: "Chhattisgarhi folk recording project",
    desk: "Culture",
    slug: "chhattisgarhi-folk-archive",
    kind: "ledger",
  },
];

export function getArchiveByYear(): Map<number, ArchiveEntry[]> {
  const map = new Map<number, ArchiveEntry[]>();
  for (const entry of ARCHIVE_TIMELINE) {
    const list = map.get(entry.year) ?? [];
    list.push(entry);
    map.set(entry.year, list);
  }
  return map;
}

export function getOngoingInvestigations(): ArchiveEntry[] {
  return ARCHIVE_TIMELINE.filter(
    (e) => e.kind === "investigation" && e.note?.includes("Ongoing")
  );
}
