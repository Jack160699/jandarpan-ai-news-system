import { EDITORIAL_IMAGES } from "./editorial-images";

export type FolioChapter = {
  id: string;
  kicker: string;
  title: string;
  excerpt: string;
  slug: string;
  image: string;
  tone: "warm" | "neutral" | "cool";
};

export const folioChapters: FolioChapter[] = [
  {
    id: "folio-1",
    kicker: "Chapter I · Raipur",
    title: "The counter where the file returned",
    excerpt:
      "Eleven days without a scan. Then the queue doubled. CG Bhaskar stayed at the window until closing.",
    slug: "naya-raipur-file",
    image: EDITORIAL_IMAGES.civicOffice,
    tone: "warm",
  },
  {
    id: "folio-2",
    kicker: "Chapter II · Durg",
    title: "Class in the shadow of lorries",
    excerpt:
      "A school refuses to wait for a building. Teachers measure learning against noise.",
    slug: "school-on-the-highway",
    image: EDITORIAL_IMAGES.schoolIndia,
    tone: "neutral",
  },
  {
    id: "folio-3",
    kicker: "Chapter III · Bastar",
    title: "The line before the tent opened",
    excerpt:
      "Health camp turnout breaks a five-year mark. Officials and nurses tell different stories of why.",
    slug: "bastar-health-camp",
    image: EDITORIAL_IMAGES.ruralHealth,
    tone: "cool",
  },
];
