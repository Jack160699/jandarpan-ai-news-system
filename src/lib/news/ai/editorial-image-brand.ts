/**
 * Jan Darpan Chhattisgarh editorial visual system — category + region templates
 */

export const BRAND_VISUAL = {
  name: "Jan Darpan Desk",
  palette:
    "restrained navy (#0B1F3A) and deep red (#8B1E1E) accents with selective gold (#C4A35A) highlights only where culturally appropriate; warm paper undertones — never neon, never purple glow",
  typographySpace:
    "reserve calm negative space at top and bottom for Hindi/English headline overlays — never render text, letters, or logos inside the illustration",
  style:
    "premium Indian news editorial illustration for Jan Darpan — realistic atmosphere without deceptive photorealism; Chhattisgarh-aware architecture and geography when local; accurate cultural context; soft gradients; credible not sensational; unique composition per story; mobile-safe focal point for 16:9 and card crops; no malformed hands, faces, or signage artifacts",
} as const;

export type CategoryFallbackKey =
  | "civicOffice"
  | "raipurCity"
  | "schoolIndia"
  | "assemblyPolitics"
  | "ruralHealth"
  | "metroStreet"
  | "steelIndustry"
  | "cricketGround"
  | "folkCulture"
  | "waterCivic"
  | "pressConference"
  | "newsroomDesk";

export type CategoryVisualTemplate = {
  motifs: string;
  mood: string;
  composition: string;
  fallbackKey: CategoryFallbackKey;
};

const CATEGORY_TEMPLATES: Record<string, CategoryVisualTemplate> = {
  local: {
    motifs:
      "Chhattisgarh symbolic cues: sal forest silhouettes, river curves, tribal geometric patterns (abstract), Raipur civic skyline hint",
    mood: "grounded community reporting, dignified regional pride",
    composition: "wide hero band, subject left third, soft horizon",
    fallbackKey: "raipurCity",
  },
  politics: {
    motifs:
      "abstract assembly hall columns, ballot symbolism, map outline of central India — no faces",
    mood: "civic gravity, democratic process",
    composition: "center-weighted symbolic focal point",
    fallbackKey: "assemblyPolitics",
  },
  business: {
    motifs:
      "industrial growth symbols, steel/plant abstract geometry, market trend lines",
    mood: "forward-looking economic clarity",
    composition: "diagonal energy, clean grid",
    fallbackKey: "steelIndustry",
  },
  sports: {
    motifs:
      "stadium light beams, cricket pitch abstract oval, motion streaks",
    mood: "energetic but tasteful",
    composition: "dynamic lower third action",
    fallbackKey: "cricketGround",
  },
  health: {
    motifs:
      "clinic cross abstract, rural health outreach, caring hands silhouette (non-identifiable)",
    mood: "hopeful public health",
    composition: "soft focal center, airy margins",
    fallbackKey: "ruralHealth",
  },
  education: {
    motifs:
      "classroom books stack abstract, school building silhouette, learning paths",
    mood: "optimistic youth futures",
    composition: "open center space for headline",
    fallbackKey: "schoolIndia",
  },
  technology: {
    motifs:
      "digital network nodes, newsroom screens abstract, connectivity arcs",
    mood: "modern credible tech",
    composition: "balanced tech editorial",
    fallbackKey: "newsroomDesk",
  },
  world: {
    motifs:
      "globe wireframe abstract, diplomacy table shapes, connected regions",
    mood: "international context",
    composition: "expansive wide framing",
    fallbackKey: "metroStreet",
  },
  entertainment: {
    motifs:
      "cultural festival colors abstract, stage light cones, folk pattern borders",
    mood: "celebratory but restrained",
    composition: "rich color field with calm headline zone",
    fallbackKey: "folkCulture",
  },
};

const REGION_OVERLAYS: Record<string, string> = {
  chhattisgarh:
    "Chhattisgarh regional authenticity: Bastar forest hints, Mahanadi river motif, tribal art-inspired borders (stylized, respectful), monsoon sky gradient",
  india:
    "Pan-India civic context: diverse community silhouettes (non-identifiable), republic symbolism abstract",
  global: "International desk: neutral global map cues, diplomatic abstract shapes",
};

export function getCategoryVisualTemplate(category: string): CategoryVisualTemplate {
  const key = category.toLowerCase();
  return (
    CATEGORY_TEMPLATES[key] ??
    CATEGORY_TEMPLATES.local
  );
}

export function getRegionVisualOverlay(region: string | null): string {
  if (!region) return REGION_OVERLAYS.india;
  const r = region.toLowerCase();
  if (r === "chhattisgarh") return REGION_OVERLAYS.chhattisgarh;
  if (r === "india") return REGION_OVERLAYS.india;
  return REGION_OVERLAYS.global;
}

export function hindiFriendlyCompositionNotes(): string {
  return [
    "Composition must read well with Devanagari headline overlays.",
    "Avoid busy texture in top 20% and bottom 15% of frame (headline safe zones).",
    "Prefer clear focal subject with breathing room — Hindi readers on mobile.",
  ].join(" ");
}
