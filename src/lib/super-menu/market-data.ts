/**
 * Market snapshot — demo data with live-feel updates.
 * Replace with API route when finance feed is wired.
 */

export type MarketDirection = "up" | "down" | "flat";

export type MarketQuote = {
  id: string;
  labelEn: string;
  labelHi: string;
  value: string;
  changePct: number;
  direction: MarketDirection;
  spark: number[];
  unit?: string;
};

export type CGCommodityQuote = {
  id: string;
  cityEn: string;
  cityHi: string;
  labelEn: string;
  labelHi: string;
  value: string;
  changePct: number;
  direction: MarketDirection;
};

export type StockMover = {
  symbol: string;
  nameEn: string;
  nameHi: string;
  price: string;
  changePct: number;
  direction: MarketDirection;
};

export type MarketSnapshot = {
  updatedAt: string;
  global: MarketQuote[];
  cgFuel: CGCommodityQuote[];
  cgMandi: CGCommodityQuote[];
  indices: MarketQuote[];
  gainers: StockMover[];
  losers: StockMover[];
};

function spark(seed: number, points = 8): number[] {
  const out: number[] = [];
  let v = seed;
  for (let i = 0; i < points; i++) {
    v += (Math.sin(seed * 0.7 + i) * 0.08 + (Math.random() - 0.5) * 0.04);
    out.push(Math.max(0.2, Math.min(1, v)));
  }
  return out;
}

function dirFromPct(pct: number): MarketDirection {
  if (pct > 0.05) return "up";
  if (pct < -0.05) return "down";
  return "flat";
}

/** Build snapshot — values jitter slightly per open for “live” feel */
export function buildMarketSnapshot(): MarketSnapshot {
  const jitter = () => (Math.random() - 0.5) * 0.35;
  const goldPct = 0.42 + jitter();
  const silverPct = -0.18 + jitter();
  const petrolPct = 0.12 + jitter();
  const dieselPct = 0.08 + jitter();
  const lpgPct = 0.05 + jitter();
  const usdPct = -0.09 + jitter();
  const btcPct = 1.85 + jitter();
  const sensexPct = 0.31 + jitter();
  const niftyPct = 0.28 + jitter();

  return {
    updatedAt: new Date().toISOString(),
    global: [
      {
        id: "gold",
        labelEn: "Gold 24K",
        labelHi: "सोना 24K",
        value: "₹7,248",
        unit: "/g",
        changePct: goldPct,
        direction: dirFromPct(goldPct),
        spark: spark(0.72),
      },
      {
        id: "silver",
        labelEn: "Silver",
        labelHi: "चाँदी",
        value: "₹89,420",
        unit: "/kg",
        changePct: silverPct,
        direction: dirFromPct(silverPct),
        spark: spark(0.55),
      },
      {
        id: "petrol",
        labelEn: "Petrol CG",
        labelHi: "पेट्रोल CG",
        value: "₹96.82",
        unit: "/L",
        changePct: petrolPct,
        direction: dirFromPct(petrolPct),
        spark: spark(0.48),
      },
      {
        id: "diesel",
        labelEn: "Diesel CG",
        labelHi: "डीजल CG",
        value: "₹89.14",
        unit: "/L",
        changePct: dieselPct,
        direction: dirFromPct(dieselPct),
        spark: spark(0.44),
      },
      {
        id: "lpg",
        labelEn: "LPG",
        labelHi: "एलपीजी",
        value: "₹1,053",
        changePct: lpgPct,
        direction: dirFromPct(lpgPct),
        spark: spark(0.4),
      },
      {
        id: "usd",
        labelEn: "USD/INR",
        labelHi: "USD/INR",
        value: "83.42",
        changePct: usdPct,
        direction: dirFromPct(usdPct),
        spark: spark(0.38),
      },
      {
        id: "btc",
        labelEn: "Bitcoin",
        labelHi: "बिटकॉइन",
        value: "₹58.2L",
        changePct: btcPct,
        direction: dirFromPct(btcPct),
        spark: spark(0.82),
      },
    ],
    indices: [
      {
        id: "sensex",
        labelEn: "Sensex",
        labelHi: "सेंसेक्स",
        value: "74,227",
        changePct: sensexPct,
        direction: dirFromPct(sensexPct),
        spark: spark(0.65),
      },
      {
        id: "nifty",
        labelEn: "Nifty 50",
        labelHi: "निफ्टी 50",
        value: "22,596",
        changePct: niftyPct,
        direction: dirFromPct(niftyPct),
        spark: spark(0.68),
      },
    ],
    cgFuel: [
      {
        id: "rpr-petrol",
        cityEn: "Raipur",
        cityHi: "रायपुर",
        labelEn: "Petrol",
        labelHi: "पेट्रोल",
        value: "₹96.82",
        changePct: petrolPct,
        direction: dirFromPct(petrolPct),
      },
      {
        id: "bsp-petrol",
        cityEn: "Bilaspur",
        cityHi: "बिलासपुर",
        labelEn: "Petrol",
        labelHi: "पेट्रोल",
        value: "₹96.71",
        changePct: petrolPct * 0.9,
        direction: dirFromPct(petrolPct),
      },
      {
        id: "rpr-diesel",
        cityEn: "Raipur",
        cityHi: "रायपुर",
        labelEn: "Diesel",
        labelHi: "डीजल",
        value: "₹89.14",
        changePct: dieselPct,
        direction: dirFromPct(dieselPct),
      },
    ],
    cgMandi: [
      {
        id: "rice",
        cityEn: "Raipur Mandi",
        cityHi: "रायपुर मंडी",
        labelEn: "Rice (common)",
        labelHi: "चावल",
        value: "₹2,420",
        changePct: 0.6 + jitter(),
        direction: "up",
      },
      {
        id: "soy",
        cityEn: "Bilaspur",
        cityHi: "बिलासपुर",
        labelEn: "Soybean",
        labelHi: "सोयाबीन",
        value: "₹4,180",
        changePct: -0.4 + jitter(),
        direction: "down",
      },
      {
        id: "wheat",
        cityEn: "Durg",
        cityHi: "दुर्ग",
        labelEn: "Wheat",
        labelHi: "गेहूं",
        value: "₹2,650",
        changePct: 0.2 + jitter(),
        direction: "up",
      },
    ],
    gainers: [
      { symbol: "RELIANCE", nameEn: "Reliance", nameHi: "रिलायंस", price: "₹2,984", changePct: 1.42, direction: "up" },
      { symbol: "TCS", nameEn: "TCS", nameHi: "TCS", price: "₹4,102", changePct: 1.18, direction: "up" },
      { symbol: "INFY", nameEn: "Infosys", nameHi: "इंफोसिस", price: "₹1,892", changePct: 0.96, direction: "up" },
    ],
    losers: [
      { symbol: "ADANIENT", nameEn: "Adani Ent.", nameHi: "अडानी", price: "₹2,412", changePct: -1.82, direction: "down" },
      { symbol: "SBIN", nameEn: "SBI", nameHi: "SBI", price: "₹798", changePct: -0.94, direction: "down" },
      { symbol: "ITC", nameEn: "ITC", nameHi: "ITC", price: "₹428", changePct: -0.71, direction: "down" },
    ],
  };
}
