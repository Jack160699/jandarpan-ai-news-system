import { HERO_ARTICLE_SLUG } from "./articles";

export type EditorialStoryCard = {
  slug: string;
  kicker: string;
  kickerHi?: string;
  title: string;
  excerpt: string;
  span: string;
  feature?: boolean;
  readTime: string;
  offset?: string;
};

export const EDITORIAL_STORIES: EditorialStoryCard[] = [
  {
    slug: "coal-auction-transparency",
    kicker: "Politics",
    kickerHi: "राजनीति",
    title: "Coal auction transparency: what the assembly did not debate",
    excerpt:
      "Opposition members sought a discussion on valuation methods. The speaker moved to the next item in four minutes —",
    span: "lg:col-span-7",
    feature: true,
    readTime: "7 min",
  },
  {
    slug: "bastar-health-camp",
    kicker: "Chhattisgarh",
    kickerHi: "छत्तीसगढ़",
    title: "Bastar health camp sees record turnout after route changes",
    excerpt:
      "Officials credit scheduling. Nurses cite word of mouth and shorter walks to the tent line —",
    span: "lg:col-span-5",
    readTime: "5 min",
    offset: "lg:mt-12",
  },
  {
    slug: "school-on-the-highway",
    kicker: "Education",
    kickerHi: "शिक्षा",
    title: "The school that teaches beside the highway",
    excerpt:
      "In Durg, teachers hold class as lorries shake the tin roof. A community built a curriculum in the noise —",
    span: "lg:col-span-4",
    readTime: "11 min",
    offset: "lg:mt-20",
  },
  {
    slug: "raipur-metro-debate",
    kicker: "Raipur",
    title: "Metro debate returns to the corporation chamber",
    excerpt:
      "Merchants want assurances on access roads. Engineers want a season without festival delays —",
    span: "lg:col-span-4",
    readTime: "6 min",
  },
  {
    slug: "steel-plant-shifts",
    kicker: "Business",
    kickerHi: "व्यापार",
    title: "Steel plant night shifts expand as orders stabilise",
    excerpt:
      "Bhilai units report steadier demand. Unions ask for heat protocols in Hindi and English —",
    span: "lg:col-span-4",
    readTime: "4 min",
    offset: "lg:mt-8",
  },
  {
    slug: "stadium-youth-league",
    kicker: "Sports",
    kickerHi: "खेल",
    title: "Youth league final draws families from three districts",
    excerpt:
      "A rain-delayed match becomes the most-watched local final in five seasons —",
    span: "lg:col-span-4",
    readTime: "4 min",
    offset: "lg:mt-16",
  },
  {
    slug: "chhattisgarhi-folk-archive",
    kicker: "Culture",
    title: "A folk archive gathers songs before monsoon weddings",
    excerpt:
      "Volunteers record elders in Rajnandgaon. Scholars argue over spelling, not urgency —",
    span: "lg:col-span-5",
    readTime: "6 min",
  },
  {
    slug: "water-timing-raipur",
    kicker: "Civic",
    kickerHi: "नागरिक",
    title: "New water timing charts posted ward by ward",
    excerpt:
      "Residents photograph schedules on phones. Old charts remain on some walls, fading —",
    span: "lg:col-span-3",
    readTime: "3 min",
  },
];

export { HERO_ARTICLE_SLUG };
