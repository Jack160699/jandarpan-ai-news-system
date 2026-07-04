/**
 * Category-specific artistic guidance for editorial hero images
 */

import type { EditorialStoryTheme } from "@/lib/news/ai/editorial-image-entities";

export type StyleGuidance = {
  artisticDirection: string;
  mood: string;
  composition: string;
  colorNotes: string;
  avoid: string[];
};

const STYLE_MAP: Record<EditorialStoryTheme, StyleGuidance> = {
  crime: {
    artisticDirection:
      "Serious civic journalism illustration — abstract courthouse scales, police badge silhouette (generic), muted tension without sensationalism",
    mood: "gravitas, accountability, public safety",
    composition: "diagonal tension, dark-to-light gradient, focal left third",
    colorNotes: "deep blues, charcoal, restrained amber accent",
    avoid: ["gore", "weapons pointed at viewer", "identifiable victims"],
  },
  politics: {
    artisticDirection:
      "Democratic process symbolism — assembly columns, ballot box abstract, map outlines without faces",
    mood: "civic gravity, democratic trust",
    composition: "center-weighted institutional focal point",
    colorNotes: "saffron-green-neutral republic palette",
    avoid: ["politician portraits", "party logos", "campaign posters"],
  },
  sports: {
    artisticDirection:
      "Dynamic stadium energy — cricket pitch oval, motion streaks, crowd light beams (abstract)",
    mood: "energetic celebration of sport",
    composition: "lower-third action diagonal",
    colorNotes: "vibrant greens, stadium floodlight warmth",
    avoid: ["identifiable athletes", "team logos"],
  },
  business: {
    artisticDirection:
      "Economic growth abstraction — trend lines, industrial geometry, market grid",
    mood: "forward-looking clarity",
    composition: "clean diagonal grid with focal metric shape",
    colorNotes: "steel blue, growth green, professional beige",
    avoid: ["stock ticker text", "company logos"],
  },
  technology: {
    artisticDirection:
      "Digital connectivity — network nodes, screen glow abstract, innovation arcs",
    mood: "modern credible tech",
    composition: "balanced tech editorial with negative space",
    colorNotes: "cool blues, subtle neon accents",
    avoid: ["brand interfaces", "readable UI text"],
  },
  education: {
    artisticDirection:
      "Learning pathways — books stack abstract, campus silhouette, rising sun metaphor",
    mood: "optimistic youth futures",
    composition: "open center for headline overlay",
    colorNotes: "warm yellows, hopeful sky blue",
    avoid: ["identifiable students", "school logos"],
  },
  health: {
    artisticDirection:
      "Public health hope — clinic cross abstract, caring hands silhouette, wellness circles",
    mood: "hopeful community care",
    composition: "soft focal center, airy margins",
    colorNotes: "calming teal, soft white, life green",
    avoid: ["graphic medical imagery", "identifiable patients"],
  },
  entertainment: {
    artisticDirection:
      "Cultural celebration — stage lights, folk pattern borders, festival color fields",
    mood: "celebratory but restrained",
    composition: "rich color field with calm headline zone",
    colorNotes: "festive saffron, magenta accents, gold highlights",
    avoid: ["celebrity likeness", "movie posters"],
  },
  weather: {
    artisticDirection:
      "Atmospheric mood — monsoon clouds, rain curves, sun breaks, seasonal sky gradients",
    mood: "environmental awareness",
    composition: "expansive sky-dominant wide band",
    colorNotes: "monsoon grey-blue, lightning amber hint",
    avoid: ["disaster exploitation", "identifiable disaster victims"],
  },
  breaking: {
    artisticDirection:
      "Urgent editorial energy — bold symbolic focal, dynamic light rays, credible not tabloid",
    mood: "immediate importance without sensationalism",
    composition: "strong left anchor, motion toward right",
    colorNotes: "alert amber, deep contrast, newsroom red accent sparingly",
    avoid: ["tabloid shock", "misleading incident photos"],
  },
  opinion: {
    artisticDirection:
      "Thoughtful editorial column — pen and ink abstract, debate table shapes, perspective lines",
    mood: "reflective analysis",
    composition: "minimal symbolic center with generous margins",
    colorNotes: "paper beige, ink blue, thoughtful grey",
    avoid: ["caricatures of real people"],
  },
  festival: {
    artisticDirection:
      "Regional celebration — diyas, tribal art motifs, community gathering silhouettes",
    mood: "joyful cultural pride",
    composition: "symmetric festive framing",
    colorNotes: "rich saffron, marigold, forest green",
    avoid: ["religious offense", "identifiable worshippers"],
  },
  government: {
    artisticDirection:
      "Public administration — government building silhouette, scheme document abstract, community service icons",
    mood: "transparent governance",
    composition: "institutional wide framing",
    colorNotes: "official green, trustworthy blue",
    avoid: ["politician faces", "government seals"],
  },
  economy: {
    artisticDirection:
      "Macro economic narrative — currency abstract shapes, growth charts (no numbers), factory-farm blend",
    mood: "analytical stability",
    composition: "data-inspired clean grid",
    colorNotes: "fiscal blue, growth green, neutral grey",
    avoid: ["readable financial data", "currency portraits"],
  },
  accident: {
    artisticDirection:
      "Solemn public safety awareness — warning signs abstract, road curves, emergency response symbols (no victims)",
    mood: "serious caution, community concern",
    composition: "muted wide scene with symbolic focal",
    colorNotes: "amber warning, grey-blue solemnity",
    avoid: ["crash photos", "injuries", "bodies"],
  },
  election: {
    artisticDirection:
      "Democratic participation — ballot box, inked finger abstract, voting booth silhouette",
    mood: "civic participation energy",
    composition: "centered democratic symbol",
    colorNotes: "tricolor hints abstract, ink blue",
    avoid: ["candidate photos", "party symbols"],
  },
  general: {
    artisticDirection:
      "Premium regional news illustration — symbolic storytelling, community context",
    mood: "trustworthy regional journalism",
    composition: "wide hero band, subject left third",
    colorNotes: "Jan Darpan saffron-green palette",
    avoid: ["generic stock photo look", "embedded text"],
  },
};

export function getStyleGuidance(theme: EditorialStoryTheme): StyleGuidance {
  return STYLE_MAP[theme] ?? STYLE_MAP.general;
}

export function getUrgencyStyleTier(urgencyScore: number, isBreaking: boolean): string {
  if (isBreaking || urgencyScore >= 80) {
    return "breaking-tier — dynamic credible urgency, strong focal, not tabloid";
  }
  if (urgencyScore >= 50) {
    return "standard newsroom — confident trustworthy editorial illustration";
  }
  return "calm feature — soft symbolic storytelling, generous headline space";
}
