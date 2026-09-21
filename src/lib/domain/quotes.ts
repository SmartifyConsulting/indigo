import { hashOf } from "./sha256";
import type {
  CaseRecord,
  NeedId,
  NeedItem,
  Provider,
  ProviderId,
  Quote,
  RoaContent,
} from "./types";
import { PROVIDERS, providerName } from "./types";

/**
 * Quote provider seam. The simulated pricing below is what runs in the prototype; each
 * insurer's live quoting API is swapped in behind `QuoteProvider` without touching the
 * store or UI.
 */
export interface QuoteRequest {
  needId: NeedId;
  cover: number;
  unit: "lump" | "monthly";
  age: number;
  smoker: boolean;
}

export interface QuoteProvider {
  provider: Provider;
  quote(req: QuoteRequest): Omit<Quote, "id"> | null;
}

const FACTOR: Record<ProviderId, number> = {
  momentum: 1.0,
  discovery: 1.12,
  "old-mutual": 0.95,
  sanlam: 1.04,
  santam: 1.0,
  "auto-general": 0.9,
};

const PRODUCT: Record<ProviderId, Partial<Record<NeedId, { name: string; features: string[] }>>> = {
  momentum: {
    life: {
      name: "Momentum Life Cover",
      features: ["Cover increases with CPI", "Premium waiver on disability"],
    },
    disability: {
      name: "Momentum Income Protector",
      features: ["Benefit to age 65", "Occupation-based definition"],
    },
    "severe-illness": {
      name: "Momentum Severe Illness Benefit",
      features: ["Covers 240+ conditions", "Partial payouts"],
    },
  },
  discovery: {
    life: {
      name: "Discovery Life Plan",
      features: ["Vitality premium discounts", "Cover increases with CPI"],
    },
    disability: {
      name: "Discovery Income Protection",
      features: ["Vitality Active Rewards", "Own-occupation definition"],
    },
    "severe-illness": {
      name: "Discovery Severe Illness Cover",
      features: ["Three severity levels", "Vitality health checks"],
    },
  },
  "old-mutual": {
    life: {
      name: "Old Mutual Greenlight Life",
      features: ["Guaranteed level premiums", "Free cover for children"],
    },
    disability: {
      name: "Old Mutual Income Cover",
      features: ["Fixed benefit escalation", "Short 1-month waiting period"],
    },
    "severe-illness": {
      name: "Old Mutual Critical Illness",
      features: ["Payout on diagnosis", "Cancer relapse benefit"],
    },
  },
  sanlam: {
    life: {
      name: "Sanlam Reality Life Cover",
      features: ["Convertible to whole of life", "Accidental death boost"],
    },
    disability: {
      name: "Sanlam Reality Income Benefit",
      features: ["Rehabilitation support", "Waiting periods 1 to 12 months"],
    },
    "severe-illness": {
      name: "Sanlam Reality Dread Disease",
      features: ["Multiple claim options", "Second-opinion service"],
    },
  },
  santam: {
    vehicle: {
      name: "Santam Vehicle Cover",
      features: ["Agreed value option", "Roadside assistance"],
    },
    "home-building": {
      name: "Santam Home Buildings",
      features: ["Storm and geyser cover", "Alternative accommodation"],
    },
    "home-contents": {
      name: "Santam Household Contents",
      features: ["All-risk items schedule", "Power surge cover"],
    },
    "pet-cover": {
      name: "Santam Pet Cover",
      features: ["Vet bills and surgery", "Third-party liability"],
    },
  },
  "auto-general": {
    vehicle: {
      name: "Auto & General Car Insurance",
      features: ["Direct pricing", "Free windscreen replacement"],
    },
    "home-building": {
      name: "Auto & General Home Insurance",
      features: ["Basic excess options", "Burst pipe cover"],
    },
    "home-contents": {
      name: "Auto & General Contents",
      features: ["Theft and fire cover", "Optional all-risk"],
    },
    "pet-cover": {
      name: "Auto & General Pet Insurance",
      features: ["Accident and illness", "Lost pet advertising"],
    },
  },
};

const ratePer1000Life = (age: number) => 0.09 * Math.exp((age - 25) * 0.055);
const ratePerRandIp = (age: number) => 0.018 * Math.exp((age - 25) * 0.04);
const ratePer1000Si = (age: number) => 0.45 * Math.exp((age - 25) * 0.05);

function premium(needId: NeedId, req: QuoteRequest, f: number): number {
  const smoke = req.smoker ? 1.75 : 1;
  switch (needId) {
    case "life":
      return (req.cover / 1000) * ratePer1000Life(req.age) * f * smoke;
    case "disability":
      return req.cover * ratePerRandIp(req.age) * f * (req.smoker ? 1.2 : 1);
    case "severe-illness":
      return (req.cover / 1000) * ratePer1000Si(req.age) * f * smoke;
    case "vehicle":
      return ((req.cover * 0.075) / 12) * f * (req.age < 26 ? 1.3 : 1);
    case "home-building":
      return req.cover * 0.0005 * f;
    case "home-contents":
      return req.cover * 0.0012 * f;
    case "pet-cover":
      return req.cover * 0.008 * f;
    default:
      return 0;
  }
}

export const QUOTE_PROVIDERS: QuoteProvider[] = PROVIDERS.map((provider) => ({
  provider,
  quote(req) {
    const product = PRODUCT[provider.id][req.needId];
    if (!product) return null;
    const monthlyPremium = Math.round(premium(req.needId, req, FACTOR[provider.id]));
    const underwriting =
      provider.line === "life" && req.needId !== "disability" && req.cover > 3_000_000
        ? "medical"
        : provider.line === "life" && req.needId === "disability"
          ? "medical"
          : "none";
    return {
      providerId: provider.id,
      needId: req.needId,
      product: product.name,
      cover: req.cover,
      unit: req.unit,
      monthlyPremium,
      underwriting,
      features: product.features,
      providerRef: `${provider.id.slice(0, 3).toUpperCase()}-${hashOf([provider.id, req]).slice(0, 8).toUpperCase()}`,
    };
  },
}));

/** The needs that will be quoted: the full FNA output, or one advisor-entered need under a single-need disclaimer. */
export function quotableNeeds(c: CaseRecord): NeedItem[] {
  if (c.fnaMode === "single-need" && c.singleNeed) {
    return [
      {
        id: c.singleNeed.needId,
        category: ["vehicle", "home-building", "home-contents", "pet-cover"].includes(
          c.singleNeed.needId,
        )
          ? "short-term"
          : "life",
        label: needLabel(c.singleNeed.needId),
        unit: c.singleNeed.needId === "disability" ? "monthly" : "lump",
        current: 0,
        required: c.singleNeed.amount,
        gap: c.singleNeed.amount,
        quotable: true,
        rationale:
          "Single need requested by the client. No full needs analysis was performed (see signed disclaimer).",
      },
    ];
  }
  return (c.fna.result?.needs ?? []).filter((n) => n.quotable && n.gap > 0);
}

export function needLabel(id: NeedId) {
  return (
    {
      life: "Life cover",
      disability: "Income protection",
      "severe-illness": "Severe illness cover",
      vehicle: "Vehicle insurance",
      "home-building": "Home buildings",
      "home-contents": "Household contents",
      "pet-cover": "Pet cover",
      "business-liability": "Business liability",
      retirement: "Retirement savings",
      offshore: "Offshore allocation",
    } as Record<NeedId, string>
  )[id];
}

export function generateQuotes(c: CaseRecord): Quote[] {
  const out: Quote[] = [];
  for (const need of quotableNeeds(c)) {
    for (const qp of QUOTE_PROVIDERS) {
      const q = qp.quote({
        needId: need.id,
        cover: need.gap,
        unit: need.unit,
        age: c.age,
        smoker: c.smoker,
      });
      if (q) out.push({ ...q, id: `${c.id}:${qp.provider.id}:${need.id}` });
    }
  }
  return out;
}

/** Affordability bands: total premiums as a share of net monthly income. */
export function affordability(
  totalPremium: number,
  netIncome: number,
): Pick<RoaContent, "affordabilityPct" | "affordability"> {
  const pct = netIncome > 0 ? (totalPremium / netIncome) * 100 : 100;
  return {
    affordabilityPct: Math.round(pct * 10) / 10,
    affordability: pct <= 15 ? "comfortable" : pct <= 25 ? "stretched" : "unaffordable",
  };
}

export function buildRoaContent(c: CaseRecord, advisorName: string, fspName: string): RoaContent {
  const selected = c.quotes.items.filter((q) => c.quotes.selectedIds.includes(q.id));
  const total = selected.reduce((s, q) => s + q.monthlyPremium, 0);
  const needs = quotableNeeds(c);
  const allNeeds =
    c.fnaMode === "full" ? (c.fna.result?.needs ?? []).filter((n) => n.gap > 0) : needs;
  return {
    clientName: c.clientName,
    advisor: advisorName,
    fspName,
    fnaMode: c.fnaMode === "single-need" ? "single-need" : "full",
    needs: allNeeds.map((n) => ({ id: n.id, label: n.label, gap: n.gap, unit: n.unit })),
    recommendations: selected.map((q) => ({
      quoteId: q.id,
      provider: providerName(q.providerId),
      product: q.product,
      cover: q.cover,
      unit: q.unit,
      monthlyPremium: q.monthlyPremium,
    })),
    totalMonthlyPremium: total,
    monthlyNetIncome: c.monthlyNetIncome,
    ...affordability(total, c.monthlyNetIncome),
    riskProfile: c.fna.inputs?.riskProfile ?? "not assessed (single need)",
    commentary: c.quotes.commentary.trim(),
  };
}
