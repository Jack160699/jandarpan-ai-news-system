import { EDITORIAL_IMAGES } from "./editorial-images";

export type Article = {
  slug: string;
  kicker: string;
  kickerHi?: string;
  title: string;
  titleHi?: string;
  deck: string;
  author: string;
  role: string;
  filedFrom: string;
  readTime: string;
  image: string;
  imageCredit: string;
  paragraphs: string[];
  pullQuote: string;
  category: string;
};

export const HERO_ARTICLE_SLUG = "naya-raipur-file";

export const articles: Record<string, Article> = {
  [HERO_ARTICLE_SLUG]: {
    slug: HERO_ARTICLE_SLUG,
    kicker: "Investigation",
    kickerHi: "खोज",
    title: "When the Naya Raipur file went missing",
    titleHi: "जब नया रायपुर की फाइल गायब हो गई",
    deck:
      "A land allotment register vanished from a civic server for eleven days. Farmers, officials, and a quiet clerk describe what happens when paperwork becomes power.",
    author: "Ananya Tiwari",
    role: "Investigations · Raipur",
    filedFrom: "Filed from Raipur · CG Bhaskar Investigations",
    readTime: "16 min",
    image: EDITORIAL_IMAGES.civicOffice,
    imageCredit: "Photograph · CG Bhaskar Archive",
    category: "Investigations",
    pullQuote:
      "In Chhattisgarh, a missing file is never only a technical error — it is a story about who gets to wait.",
    paragraphs: [
      "The clerk noticed the gap on a Tuesday, which is when the civic office is loudest and least patient. Row 412 of the Naya Raipur allotment register showed a name, a date, and then — for eleven days — nothing where a scan should have been.",
      "Farmers from two villages had already made the journey twice. They carried folders thick with stamps, photographs of boundary stones, and letters written in block capitals by relatives who could not leave the fields. Each time they were told the system was updating.",
      "CG Bhaskar began reviewing the access logs after a tip that did not arrive on letterhead. What emerged was not a hacker drama but something more familiar: a sequence of permissions granted, revoked, and granted again within the same department.",
      "Deputy Secretary Mehta, speaking on condition that we not quote her directly on internal matters, said the state was committed to transparency. The farmers said transparency is a word that reaches them after the monsoon reaches someone else.",
      "On the fourth night of reporting, a backup drive surfaced in an adjacent office. It contained not only the missing pages but earlier versions — including one dated before a public hearing that officials had said was never scheduled.",
      "Land, in Naya Raipur, is discussed in the language of smart cities and satellite maps. On the ground it is discussed in the language of cousins, canals, and the distance to the bus stand.",
      "Tiwari spent a week cross-referencing names that appeared on the restored file with names on protest petitions filed two years earlier. Twelve matched. Three belonged to families who said they had never been informed of any hearing.",
      "The IT vendor issued a statement describing a routine migration. The vendor's contract, obtained through a filing request, describes migration windows and penalty clauses that do not mention eleven-day gaps.",
      "By the time this edition went to press, the register was online again. The queue outside the office was longer than before. People stood with umbrellas and plastic chairs, as if waiting for a ticket to a film they already knew the ending of.",
      "What remains is not only a civic mystery but a regional pattern: when records hesitate, citizens learn to hesitate too — and newspapers learn to stay longer at the counter than the press release suggests.",
    ],
  },
  "school-on-the-highway": {
    slug: "school-on-the-highway",
    kicker: "Education",
    kickerHi: "शिक्षा",
    title: "The school that teaches beside the highway",
    titleHi: "राजमार्ग के किनारे पढ़ाने वाला स्कूल",
    deck:
      "In Durg district, teachers hold class as lorries shake the tin roof. A community refused to wait for a building and built a curriculum in the noise.",
    author: "Vikram Joshi",
    role: "Education Correspondent",
    filedFrom: "Filed from Durg · Education desk",
    readTime: "11 min",
    image: EDITORIAL_IMAGES.schoolIndia,
    imageCredit: "Photograph · CG Bhaskar",
    category: "Education",
    pullQuote:
      "हमें इमारत नहीं, समय चाहिए — और समय भी कभी-कभी रुक जाता है।",
    paragraphs: [
      "Class begins when the first lorry passes, which is to say class never truly begins in silence. The Saraswati Shishu Mandir annex — a row of rooms painted blue behind a petrol pump — has learned to teach through vibration.",
      "Head teacher Smt. Rekha Nishad said the highway was not a metaphor. It was a timetable. Science after peak traffic. Hindi when the horns thin. Mathematics when the afternoon heat makes the metal roof a second sun.",
      "Parents built the annex after a main building fund stalled for three years. They pooled bamboo, tin, and twelve evenings of labor. The district record lists the project as pending. The community lists it as open.",
      "Joshi visited on a day when the state inspection team was expected. The team did not come. The students practiced a welcome song anyway, standing in shoes polished with mustard oil.",
      "Education officials in Raipur said allocations were on schedule. The school's ledger, shown to us in a notebook with cloth cover, lists chalk, kerosene for the generator, and fees waived for eleven students.",
      "What distinguishes this filing is not outrage alone but precision: a school operating in plain sight, measuring learning against decibels, asking neither for spectacle nor for pity — only for a wall that does not shake when a sentence is half-finished.",
    ],
  },
  "coal-auction-transparency": {
    slug: "coal-auction-transparency",
    kicker: "Politics",
    title: "Coal auction transparency: what the assembly did not debate",
    deck:
      "Opposition members sought a discussion on valuation methods. The speaker moved to the next item in four minutes.",
    author: "Sanjay Dubey",
    role: "Politics Desk",
    filedFrom: "Raipur · Assembly beat",
    readTime: "7 min",
    image: EDITORIAL_IMAGES.assemblyPolitics,
    imageCredit: "CG Bhaskar",
    category: "Politics",
    pullQuote: "Procedure, in the capital, has its own weather.",
    paragraphs: [
      "The question was listed at item nine. By item eleven the gallery had thinned. By item twelve the recording officer had closed the day's primary folder.",
      "Dubey reconstructs the four minutes from assembly footage and three interviews with members who agreed to speak only if their party affiliation was named alongside their remarks.",
    ],
  },
  "bastar-health-camp": {
    slug: "bastar-health-camp",
    kicker: "Chhattisgarh",
    title: "Bastar health camp sees record turnout after mobile clinic route changes",
    deck:
      "Officials credit new scheduling. Nurses cite word of mouth and shorter walks to the tent line.",
    author: "Meera Patel",
    role: "State Correspondent",
    filedFrom: "Filed from Jagdalpur",
    readTime: "5 min",
    image: EDITORIAL_IMAGES.ruralHealth,
    imageCredit: "CG Bhaskar",
    category: "Chhattisgarh",
    pullQuote: "The queue began before the tent cloth was tied.",
    paragraphs: [
      "By 8 AM the line crossed the laterite path and bent toward the hand pump. Mothers held cards in plastic sleeves. Elders sat on woven mats brought from home.",
    ],
  },
  "raipur-metro-debate": {
    slug: "raipur-metro-debate",
    kicker: "Raipur",
    title: "Raipur metro debate returns to the corporation chamber",
    deck:
      "Merchants want assurances on access roads. Engineers want a season without festival delays.",
    author: "P. Sharma",
    role: "Raipur Desk",
    filedFrom: "Filed from Raipur",
    readTime: "6 min",
    image: EDITORIAL_IMAGES.metroStreet,
    imageCredit: "CG Bhaskar",
    category: "Raipur",
    pullQuote: "Every map is also a market map.",
    paragraphs: [
      "The chamber filled with the kind of polite heat that happens when everyone has read the same feasibility study and arrived with different hopes.",
    ],
  },
  "steel-plant-shifts": {
    slug: "steel-plant-shifts",
    kicker: "Business",
    title: "Steel plant night shifts expand as orders stabilise",
    deck:
      "Bhilai units report steadier demand. Unions ask for heat protocols to be posted in Hindi and English.",
    author: "R. Verma",
    role: "Business Desk",
    filedFrom: "Filed from Bhilai",
    readTime: "4 min",
    image: EDITORIAL_IMAGES.steelIndustry,
    imageCredit: "CG Bhaskar",
    category: "Business",
    pullQuote: "Production speaks first; policy answers later.",
    paragraphs: [
      "The expansion is modest on paper — twelve percent night capacity — but visible in the bus stops after midnight, where thermoses and shift tags appear in pairs.",
    ],
  },
  "stadium-youth-league": {
    slug: "stadium-youth-league",
    kicker: "Sports",
    title: "Youth league final draws families from three districts",
    deck:
      "A rain-delayed match becomes the most-watched local final in five seasons.",
    author: "K. Sahu",
    role: "Sports Desk",
    filedFrom: "Filed from Raipur",
    readTime: "4 min",
    image: EDITORIAL_IMAGES.cricketGround,
    imageCredit: "CG Bhaskar",
    category: "Sports",
    pullQuote: "The scoreboard flickered; nobody left.",
    paragraphs: [
      "Children sat on the railing singing team songs. Vendors ran out of oranges before oranges were supposed to matter.",
    ],
  },
  "chhattisgarhi-folk-archive": {
    slug: "chhattisgarhi-folk-archive",
    kicker: "Culture",
    title: "A folk archive gathers songs before the monsoon weddings",
    deck:
      "Volunteers record elders in Rajnandgaon. Scholars argue over spelling, not over urgency.",
    author: "Lata Menon",
    role: "Culture Desk",
    filedFrom: "Filed from Rajnandgaon",
    readTime: "6 min",
    image: EDITORIAL_IMAGES.folkCulture,
    imageCredit: "CG Bhaskar",
    category: "Culture",
    pullQuote: "Memory, here, is sung before it is written.",
    paragraphs: [
      "The archive fits in two rooms above a cooperative bank. The equipment fits in one suitcase. The urgency fits in no container at all.",
    ],
  },
  "water-timing-raipur": {
    slug: "water-timing-raipur",
    kicker: "Civic",
    title: "New water timing charts posted ward by ward",
    deck:
      "Residents photograph schedules on phones. Old charts remain on some walls, fading in the sun.",
    author: "P. Sharma",
    role: "Raipur Desk",
    filedFrom: "Filed from Raipur",
    readTime: "3 min",
    image: EDITORIAL_IMAGES.waterCivic,
    imageCredit: "CG Bhaskar",
    category: "Raipur",
    pullQuote: "A schedule is a promise with a timestamp.",
    paragraphs: [
      "In Pandri, a woman said she kept three charts in her kitchen: last year, this year, and the one a neighbor swears is coming next week.",
    ],
  },
};

export function getArticle(slug: string): Article | undefined {
  return articles[slug];
}

export function getAllArticleSlugs(): string[] {
  return Object.keys(articles);
}
