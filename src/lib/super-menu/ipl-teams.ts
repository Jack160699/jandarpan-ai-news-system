/** IPL team metadata for compact menu widgets */

export type IplTeamId =
  | "CSK"
  | "MI"
  | "RCB"
  | "KKR"
  | "SRH"
  | "RR"
  | "GT"
  | "PBKS"
  | "DC"
  | "LSG";

export type IplTeamMeta = {
  id: IplTeamId;
  short: IplTeamId;
  nameEn: string;
  nameHi: string;
  primary: string;
  secondary: string;
};

export const IPL_TEAMS: Record<IplTeamId, IplTeamMeta> = {
  CSK: {
    id: "CSK",
    short: "CSK",
    nameEn: "Chennai Super Kings",
    nameHi: "चेन्नई सुपर किंग्स",
    primary: "#FDB913",
    secondary: "#004BA0",
  },
  MI: {
    id: "MI",
    short: "MI",
    nameEn: "Mumbai Indians",
    nameHi: "मुंबई इंडियंस",
    primary: "#004BA0",
    secondary: "#D1AB3E",
  },
  RCB: {
    id: "RCB",
    short: "RCB",
    nameEn: "Royal Challengers Bengaluru",
    nameHi: "रॉयल चैलेंजर्स बेंगलुरु",
    primary: "#EC1C24",
    secondary: "#2B2A29",
  },
  KKR: {
    id: "KKR",
    short: "KKR",
    nameEn: "Kolkata Knight Riders",
    nameHi: "कोलकाता नाइट राइडर्स",
    primary: "#3A225D",
    secondary: "#B3A123",
  },
  SRH: {
    id: "SRH",
    short: "SRH",
    nameEn: "Sunrisers Hyderabad",
    nameHi: "सनराइजर्स हैदराबाद",
    primary: "#F26522",
    secondary: "#2B2A29",
  },
  RR: {
    id: "RR",
    short: "RR",
    nameEn: "Rajasthan Royals",
    nameHi: "राजस्थान रॉयल्स",
    primary: "#254AA5",
    secondary: "#E73895",
  },
  GT: {
    id: "GT",
    short: "GT",
    nameEn: "Gujarat Titans",
    nameHi: "गुजरात टाइटन्स",
    primary: "#1C2C5B",
    secondary: "#B3A123",
  },
  PBKS: {
    id: "PBKS",
    short: "PBKS",
    nameEn: "Punjab Kings",
    nameHi: "पंजाब किंग्स",
    primary: "#ED1B24",
    secondary: "#A7A9AC",
  },
  DC: {
    id: "DC",
    short: "DC",
    nameEn: "Delhi Capitals",
    nameHi: "दिल्ली कैपिटल्स",
    primary: "#0078BC",
    secondary: "#EF1B23",
  },
  LSG: {
    id: "LSG",
    short: "LSG",
    nameEn: "Lucknow Super Giants",
    nameHi: "लखनऊ सुपर जायंट्स",
    primary: "#0097D7",
    secondary: "#FFCC00",
  },
};

const ALIASES: Record<string, IplTeamId> = {
  csk: "CSK",
  "chennai super kings": "CSK",
  mi: "MI",
  "mumbai indians": "MI",
  rcb: "RCB",
  "royal challengers": "RCB",
  "royal challengers bengaluru": "RCB",
  kkr: "KKR",
  "kolkata knight riders": "KKR",
  srh: "SRH",
  sunrisers: "SRH",
  "sunrisers hyderabad": "SRH",
  rr: "RR",
  "rajasthan royals": "RR",
  gt: "GT",
  "gujarat titans": "GT",
  pbks: "PBKS",
  "punjab kings": "PBKS",
  dc: "DC",
  "delhi capitals": "DC",
  lsg: "LSG",
  "lucknow super giants": "LSG",
};

export function resolveIplTeamId(name: string): IplTeamId | null {
  const key = name.trim().toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (key.includes(alias)) return id;
  }
  const upper = name.trim().toUpperCase();
  if (upper in IPL_TEAMS) return upper as IplTeamId;
  return null;
}

export function getIplTeam(id: IplTeamId): IplTeamMeta {
  return IPL_TEAMS[id];
}
