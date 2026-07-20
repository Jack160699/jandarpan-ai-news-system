/**
 * Official / verified government source registry (minimum curated set).
 *
 * HONESTY POLICY:
 * - Only list URLs that are independently known / verified.
 * - Do NOT invent 33 district hosts. Unverified district candidates stay
 *   `probation` or `disabled` until discovery confirms they resolve.
 * - Discovery jobs fill district gaps later; prefer accuracy over count.
 */

export type OfficialSourceStatus = "verified" | "probation" | "disabled";

export type OfficialSource = {
  id: string;
  name: string;
  url: string;
  domain: string;
  kind: "state" | "district" | "national" | "weather" | "pr";
  districtSlug?: string;
  status: OfficialSourceStatus;
  notes?: string;
};

/**
 * Curated verified URLs only (real known domains).
 * Unverified district hosts remain probation/disabled — not promoted as verified.
 */
const OFFICIAL_SOURCES: OfficialSource[] = [
  // —— National ——
  {
    id: "india-gov",
    name: "National Portal of India",
    url: "https://www.india.gov.in/",
    domain: "india.gov.in",
    kind: "national",
    status: "verified",
  },
  {
    id: "pib",
    name: "Press Information Bureau",
    url: "https://pib.gov.in/",
    domain: "pib.gov.in",
    kind: "national",
    status: "verified",
  },
  {
    id: "imd-mausam",
    name: "India Meteorological Department",
    url: "https://mausam.imd.gov.in/",
    domain: "mausam.imd.gov.in",
    kind: "weather",
    status: "verified",
  },

  // —— State / NIC ——
  {
    id: "cg-nic",
    name: "Chhattisgarh NIC State Centre",
    url: "https://chhattisgarh.nic.in/",
    domain: "chhattisgarh.nic.in",
    kind: "state",
    status: "verified",
  },
  {
    id: "cg-nic-legacy",
    name: "CG NIC (cg.nic.in)",
    url: "https://cg.nic.in/",
    domain: "cg.nic.in",
    kind: "state",
    status: "verified",
    notes: "Legacy NIC host still referenced by older state services",
  },
  {
    id: "cg-samvad",
    name: "Chhattisgarh Samvad (state PR / communications)",
    url: "https://samvad.cg.nic.in/",
    domain: "samvad.cg.nic.in",
    kind: "pr",
    status: "verified",
  },

  // —— Known district portals (verified only when host is confirmed) ——
  {
    id: "district-raipur",
    name: "District Raipur",
    url: "https://raipur.gov.in/",
    domain: "raipur.gov.in",
    kind: "district",
    districtSlug: "raipur",
    status: "verified",
  },
  {
    id: "district-bastar",
    name: "District Bastar",
    url: "https://bastar.gov.in/",
    domain: "bastar.gov.in",
    kind: "district",
    districtSlug: "bastar",
    status: "verified",
  },
  {
    id: "district-durg",
    name: "District Durg",
    url: "https://durg.gov.in/",
    domain: "durg.gov.in",
    kind: "district",
    districtSlug: "durg",
    status: "probation",
    notes:
      "Likely valid India.gov district host; keep probation until independently verified",
  },
  {
    id: "district-bilaspur",
    name: "District Bilaspur",
    url: "https://bilaspur.gov.in/",
    domain: "bilaspur.gov.in",
    kind: "district",
    districtSlug: "bilaspur",
    status: "probation",
    notes:
      "Likely valid India.gov district host; keep probation until independently verified",
  },
];

export function listOfficialSources(opts?: {
  status?: OfficialSourceStatus | OfficialSourceStatus[];
  includeDisabled?: boolean;
}): OfficialSource[] {
  const statuses = opts?.status
    ? Array.isArray(opts.status)
      ? opts.status
      : [opts.status]
    : null;

  return OFFICIAL_SOURCES.filter((s) => {
    if (statuses) return statuses.includes(s.status);
    if (opts?.includeDisabled) return true;
    return s.status !== "disabled";
  });
}

export function getSourcesForDistrict(slug: string): OfficialSource[] {
  const key = slug.trim().toLowerCase();
  return OFFICIAL_SOURCES.filter(
    (s) =>
      s.status !== "disabled" &&
      (s.districtSlug === key || s.kind === "state" || s.kind === "pr")
  );
}

export function getVerifiedOfficialSources(): OfficialSource[] {
  return listOfficialSources({ status: "verified" });
}
