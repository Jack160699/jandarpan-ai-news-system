import type { DayPhase } from "./live-edition";
import { BRAND } from "./brand";

export const INSTITUTION = {
  name: BRAND.nameEn,
  nameHi: BRAND.nameHi,
  tagline: BRAND.taglineEn,
  taglineHi: BRAND.taglineHi,
  founded: BRAND.founded,
  volume: BRAND.volume,
  editionNumber: BRAND.editionNumber,
  regionalEdition: BRAND.regionalEdition,
  press: BRAND.press,
  registry: BRAND.registry,
} as const;

export type EditionRitual = "morning" | "afternoon" | "evening" | "late";

export function phaseToRitual(phase: DayPhase): EditionRitual {
  if (phase === "dawn" || phase === "morning") return "morning";
  if (phase === "afternoon") return "afternoon";
  if (phase === "evening") return "evening";
  return "late";
}

export const RITUAL_COPY: Record<
  EditionRitual,
  { greeting: string; subline: string; closure: string }
> = {
  morning: {
    greeting: "आज का प्रधान संस्करण तैयार है",
    subline: "Morning edition · Raipur desk · Filed 5:40 AM",
    closure: "The morning run is complete. The evening desk opens at four.",
  },
  afternoon: {
    greeting: "The afternoon filing is on your desk",
    subline: "State desk refresh · Civic & business",
    closure: "Edition holds until the evening investigation update.",
  },
  evening: {
    greeting: "The evening edition has arrived",
    subline: "Investigations · Culture · Final state filings",
    closure: "Tonight's edition rests. The record remains in the archive.",
  },
  late: {
    greeting: "Late desk · Final corrections",
    subline: "Holding for dawn · Bastar & Raipur wires",
    closure: "The newsroom grows quiet. CG Bhaskar endures in the record.",
  },
};

export function getEditionLineage(date = new Date()): string {
  const era = date.getFullYear() - INSTITUTION.founded;
  return `Vol. ${INSTITUTION.volume} · Ed. ${INSTITUTION.editionNumber} · ${era} years in service to Chhattisgarh`;
}

export function getPublishingLineage(): string {
  return `Since ${INSTITUTION.founded} · ${INSTITUTION.press} · ${INSTITUTION.registry}`;
}

export const NEWSROOM_DESKS = [
  { id: "raipur", name: "Raipur Desk", editor: "P. Sharma" },
  { id: "state", name: "State Desk", editor: "R. Verma" },
  { id: "investigations", name: "Investigations", editor: "A. Tiwari" },
  { id: "politics", name: "Politics Desk", editor: "S. Dubey" },
  { id: "sports", name: "Sports", editor: "K. Sahu" },
] as const;

export function getDeskForSlug(slug: string): (typeof NEWSROOM_DESKS)[number] {
  if (slug.includes("coal") || slug.includes("naya-raipur") || slug === "mining-ledger")
    return NEWSROOM_DESKS[2];
  if (slug.includes("school") || slug.includes("education"))
    return NEWSROOM_DESKS[1];
  if (slug.includes("stadium") || slug.includes("sports"))
    return NEWSROOM_DESKS[4];
  return NEWSROOM_DESKS[0];
}
