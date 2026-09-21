export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  segment: "Private Client" | "Family Office" | "Institutional" | "Retail";
  value: number;
  adviser: string;
  lastReview: string;
  status: "Active" | "Onboarding" | "Review due" | "Dormant";
  risk: "Conservative" | "Balanced" | "Growth" | "Aggressive";
  since: string;
  location: string;
};

export type Holding = {
  instrument: string;
  ticker: string;
  units: number;
  price: number;
  value: number;
  weight: number;
  gain: number;
};

export type Portfolio = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  mandate: string;
  value: number;
  ytd: number;
  cash: number;
  holdings: Holding[];
};

export type DocumentRecord = {
  id: string;
  title: string;
  type: "Statement" | "Tax pack" | "Mandate" | "KYC" | "Review note";
  client: string;
  date: string;
  size: string;
};

export const summary = {
  aum: 4_182_400_000,
  clients: 268,
  netFlows: 96_400_000,
  monthChange: 2.7,
};

export const allocation = [
  { label: "Equities", weight: 44, value: 1_840_256_000 },
  { label: "Fixed income", weight: 27, value: 1_129_248_000 },
  { label: "Alternatives", weight: 14, value: 585_536_000 },
  { label: "Property", weight: 9, value: 376_416_000 },
  { label: "Cash", weight: 6, value: 250_944_000 },
];

export const performance = [
  { month: "Jan", value: 3820 },
  { month: "Feb", value: 3864 },
  { month: "Mar", value: 3798 },
  { month: "Apr", value: 3912 },
  { month: "May", value: 3990 },
  { month: "Jun", value: 3947 },
  { month: "Jul", value: 4056 },
  { month: "Aug", value: 4118 },
  { month: "Sep", value: 4182 },
];

export const activity = [
  { id: "a1", who: "Naledi Mokoena", what: "Rebalanced Growth mandate", when: "12 min ago" },
  { id: "a2", who: "Hugh Carmichael", what: "Signed updated IPS", when: "1 hr ago" },
  { id: "a3", who: "Sasha Weinberg", what: "Deposited R 4.2m into Trust A", when: "3 hrs ago" },
  { id: "a4", who: "Thabo Dlamini", what: "Annual review scheduled", when: "Yesterday" },
  { id: "a5", who: "Lindiwe Xaba", what: "KYC refresh completed", when: "2 days ago" },
];

export const clients: Client[] = [
  {
    id: "c-1024",
    name: "Naledi Mokoena",
    email: "naledi.mokoena@example.com",
    phone: "+27 82 441 0912",
    segment: "Private Client",
    value: 184_200_000,
    adviser: "Erin Kruger",
    lastReview: "12 Aug 2026",
    status: "Active",
    risk: "Growth",
    since: "2014",
    location: "Johannesburg",
  },
  {
    id: "c-1031",
    name: "Carmichael Family Office",
    email: "office@carmichael.example",
    phone: "+27 21 402 8810",
    segment: "Family Office",
    value: 612_800_000,
    adviser: "Erin Kruger",
    lastReview: "03 Sep 2026",
    status: "Active",
    risk: "Balanced",
    since: "2009",
    location: "Cape Town",
  },
  {
    id: "c-1044",
    name: "Sasha Weinberg",
    email: "s.weinberg@example.com",
    phone: "+27 83 220 7741",
    segment: "Private Client",
    value: 92_450_000,
    adviser: "Dev Naicker",
    lastReview: "28 Jun 2026",
    status: "Review due",
    risk: "Conservative",
    since: "2018",
    location: "Durban",
  },
  {
    id: "c-1057",
    name: "Thabo Dlamini",
    email: "thabo.d@example.com",
    phone: "+27 71 908 3321",
    segment: "Private Client",
    value: 41_900_000,
    adviser: "Dev Naicker",
    lastReview: "19 Sep 2026",
    status: "Active",
    risk: "Aggressive",
    since: "2021",
    location: "Pretoria",
  },
  {
    id: "c-1063",
    name: "Sentinel Pension Fund",
    email: "trustees@sentinel.example",
    phone: "+27 11 555 6600",
    segment: "Institutional",
    value: 1_280_000_000,
    adviser: "Marta Oliveira",
    lastReview: "01 Jul 2026",
    status: "Active",
    risk: "Balanced",
    since: "2006",
    location: "Sandton",
  },
  {
    id: "c-1078",
    name: "Lindiwe Xaba",
    email: "lindiwe.xaba@example.com",
    phone: "+27 84 117 2094",
    segment: "Private Client",
    value: 28_600_000,
    adviser: "Marta Oliveira",
    lastReview: "14 Sep 2026",
    status: "Onboarding",
    risk: "Growth",
    since: "2026",
    location: "Stellenbosch",
  },
  {
    id: "c-1089",
    name: "Ravi & Anjali Pillay",
    email: "pillay.household@example.com",
    phone: "+27 82 663 1188",
    segment: "Retail",
    value: 9_340_000,
    adviser: "Sam Botha",
    lastReview: "05 May 2026",
    status: "Dormant",
    risk: "Conservative",
    since: "2019",
    location: "Umhlanga",
  },
  {
    id: "c-1092",
    name: "Arcadia Holdings Trust",
    email: "trust@arcadia.example",
    phone: "+27 21 880 4477",
    segment: "Family Office",
    value: 348_700_000,
    adviser: "Sam Botha",
    lastReview: "22 Aug 2026",
    status: "Active",
    risk: "Growth",
    since: "2012",
    location: "Franschhoek",
  },
];

const baseHoldings: Holding[] = [
  { instrument: "Global Equity Fund", ticker: "GEF", units: 128_400, price: 412.6, value: 52_977_840, weight: 28.8, gain: 12.4 },
  { instrument: "SA Government Bond 2035", ticker: "R2035", units: 420_000, price: 98.2, value: 41_244_000, weight: 22.4, gain: 4.1 },
  { instrument: "Tech Growth Composite", ticker: "TGC", units: 61_200, price: 604.1, value: 36_970_920, weight: 20.1, gain: 21.8 },
  { instrument: "Listed Property Index", ticker: "LPI", units: 210_500, price: 118.4, value: 24_923_200, weight: 13.5, gain: -3.2 },
  { instrument: "Absolute Return Hedge", ticker: "ARH", units: 18_900, price: 1_204.5, value: 22_765_050, weight: 12.4, gain: 7.6 },
  { instrument: "Money Market Call", ticker: "MMC", units: 5_100_000, price: 1.0, value: 5_100_000, weight: 2.8, gain: 0.9 },
];

export const portfolios: Portfolio[] = [
  {
    id: "p-4401",
    name: "Mokoena Growth Mandate",
    clientId: "c-1024",
    clientName: "Naledi Mokoena",
    mandate: "Discretionary — Growth",
    value: 184_200_000,
    ytd: 11.4,
    cash: 2.8,
    holdings: baseHoldings,
  },
  {
    id: "p-4418",
    name: "Carmichael Core Balanced",
    clientId: "c-1031",
    clientName: "Carmichael Family Office",
    mandate: "Discretionary — Balanced",
    value: 612_800_000,
    ytd: 8.2,
    cash: 5.1,
    holdings: baseHoldings,
  },
  {
    id: "p-4426",
    name: "Sentinel Liability Matched",
    clientId: "c-1063",
    clientName: "Sentinel Pension Fund",
    mandate: "Advisory — Liability driven",
    value: 1_280_000_000,
    ytd: 6.5,
    cash: 3.4,
    holdings: baseHoldings,
  },
  {
    id: "p-4433",
    name: "Arcadia Offshore Trust",
    clientId: "c-1092",
    clientName: "Arcadia Holdings Trust",
    mandate: "Discretionary — Offshore growth",
    value: 348_700_000,
    ytd: 14.9,
    cash: 1.6,
    holdings: baseHoldings,
  },
];

export const documents: DocumentRecord[] = [
  { id: "d-901", title: "Q3 2026 Portfolio Statement", type: "Statement", client: "Naledi Mokoena", date: "30 Sep 2026", size: "1.2 MB" },
  { id: "d-902", title: "Annual Tax Pack 2026", type: "Tax pack", client: "Carmichael Family Office", date: "28 Sep 2026", size: "4.8 MB" },
  { id: "d-903", title: "Updated Investment Mandate", type: "Mandate", client: "Sentinel Pension Fund", date: "21 Sep 2026", size: "640 KB" },
  { id: "d-904", title: "KYC Refresh — Verification", type: "KYC", client: "Lindiwe Xaba", date: "14 Sep 2026", size: "2.1 MB" },
  { id: "d-905", title: "Annual Review Minutes", type: "Review note", client: "Thabo Dlamini", date: "19 Sep 2026", size: "310 KB" },
  { id: "d-906", title: "Q2 2026 Portfolio Statement", type: "Statement", client: "Arcadia Holdings Trust", date: "30 Jun 2026", size: "1.1 MB" },
  { id: "d-907", title: "Discretionary Mandate Addendum", type: "Mandate", client: "Sasha Weinberg", date: "12 Jun 2026", size: "480 KB" },
];

export const currency = (value: number, fractionDigits = 0) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);

export const compactCurrency = (value: number) =>
  `R ${new Intl.NumberFormat("en-ZA", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;

export const getClient = (id: string) => clients.find((c) => c.id === id);
export const getPortfoliosForClient = (id: string) => portfolios.filter((p) => p.clientId === id);
