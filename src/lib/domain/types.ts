export type Role = "client" | "advisor" | "fsp" | "insurer";

export const ROLE_LABEL: Record<Role, string> = {
  client: "Client",
  advisor: "Wealth Manager",
  fsp: "FSP / Key Individual",
  insurer: "Insurer",
};

export const ROLE_TAG: Record<Role, string> = {
  client: "C",
  advisor: "WM",
  fsp: "FSP",
  insurer: "I",
};

export type NeedCategory = "life" | "short-term" | "investment";

export type ProviderId =
  "momentum" | "discovery" | "old-mutual" | "sanlam" | "santam" | "auto-general";

export interface Provider {
  id: ProviderId;
  name: string;
  line: Exclude<NeedCategory, "investment">;
}

export const PROVIDERS: Provider[] = [
  { id: "momentum", name: "Momentum", line: "life" },
  { id: "discovery", name: "Discovery", line: "life" },
  { id: "old-mutual", name: "Old Mutual", line: "life" },
  { id: "sanlam", name: "Sanlam", line: "life" },
  { id: "santam", name: "Santam", line: "short-term" },
  { id: "auto-general", name: "Auto & General", line: "short-term" },
];

export const providerName = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)?.name ?? id;

/* ------------------------------------------------------------------ FNA */

export type MaritalStatus = "single" | "married" | "divorced" | "widowed";

export type RiskProfile = "conservative" | "moderate" | "aggressive";

export interface FnaInputs {
  maritalStatus: MaritalStatus;
  riskProfile: RiskProfile;
  pets: number;
  existingPetCover: number;
  dependants: number;
  youngestDependantAge: number;
  grossAnnualIncome: number;
  monthlyExpenses: number;
  bond: number;
  otherDebts: number;
  liquidAssets: number;
  investmentAssets: number;
  propertyValue: number;
  retirementFundValue: number;
  monthlyRetirementSaving: number;
  offshorePct: number;
  existingLifeCover: number;
  existingIncomeProtection: number; // monthly benefit
  existingSevereIllness: number;
  vehicleValue: number;
  buildingValue: number;
  contentsValue: number;
  existingVehicleCover: number;
  existingBuildingCover: number;
  existingContentsCover: number;
  hasBusiness: boolean;
  existingBusinessLiability: number;
}

export type NeedId =
  | "life"
  | "disability"
  | "severe-illness"
  | "vehicle"
  | "home-building"
  | "home-contents"
  | "business-liability"
  | "retirement"
  | "offshore"
  | "pet-cover";

export interface NeedItem {
  id: NeedId;
  category: NeedCategory;
  label: string;
  unit: "lump" | "monthly";
  current: number;
  required: number;
  gap: number;
  quotable: boolean;
  rationale: string;
}

export interface EstateEstimate {
  grossEstate: number;
  liabilities: number;
  costs: number;
  dutiable: number;
  abatement: number;
  taxable: number;
  duty: number;
  note: string;
}

export interface FnaResult {
  needs: NeedItem[];
  estate: EstateEstimate;
  assumptions: string[];
  computedAt: string;
}

/* --------------------------------------------------------------- Quoting */

export interface Quote {
  id: string;
  providerId: ProviderId;
  needId: NeedId;
  product: string;
  cover: number;
  unit: "lump" | "monthly";
  monthlyPremium: number;
  underwriting: "none" | "medical";
  features: string[];
  providerRef: string;
}

/* ---------------------------------------------------------- Documents/ROA */

export type SignatureKind =
  "disclosure" | "loa" | "single-need" | "mandate" | "roa" | "debit-order" | "life-declaration";

export const SIGNATURE_LABEL: Record<SignatureKind, string> = {
  disclosure: "Pre-quote advisor disclosure",
  loa: "Letter of Authority (LOA)",
  "single-need": "Single-need disclaimer",
  mandate: "Updated authority mandate",
  roa: "Record of Advice (ROA)",
  "debit-order": "Debit order mandate",
  "life-declaration": "Life declaration",
};

export interface Signature {
  id: string;
  kind: SignatureKind;
  signerName: string;
  signedAt: string;
  docHash: string;
  roaVersion?: number | undefined;
}

export interface RoaContent {
  clientName: string;
  advisor: string;
  fspName: string;
  fnaMode: "full" | "single-need";
  needs: { id: NeedId; label: string; gap: number; unit: "lump" | "monthly" }[];
  recommendations: {
    quoteId: string;
    provider: string;
    product: string;
    cover: number;
    unit: "lump" | "monthly";
    monthlyPremium: number;
  }[];
  totalMonthlyPremium: number;
  monthlyNetIncome: number;
  affordabilityPct: number;
  affordability: "comfortable" | "stretched" | "unaffordable";
  riskProfile: string;
  commentary: string;
}

export interface RoaVersion {
  version: number;
  createdAt: string;
  hash: string;
  content: RoaContent;
}

/* -------------------------------------------------------------- Portfolio */

export interface ExternalPolicy {
  id: string;
  provider: string;
  type:
    | "Life"
    | "Disability"
    | "Severe illness"
    | "Retirement annuity"
    | "Unit trust"
    | "Endowment"
    | "Offshore"
    | "Vehicle"
    | "Household";
  /** Short-term lines only: claims in the last 36 months, from the insurer's claims history. */
  claims?: number | undefined;
  reference: string;
  value: number; // cover amount or fund value
  monthlyPremium: number;
}

export interface Application {
  quoteId: string;
  providerId: ProviderId;
  product: string;
  needsMedical: boolean;
  status: "submitted" | "issued" | "declined";
  submittedAt: string;
  decidedAt?: string | undefined;
  policyNumber?: string | undefined;
}

/* ------------------------------------------------------------------- Case */

export interface CaseRecord {
  id: string;
  code: string;
  createdAt: string;
  advisorId: string;
  clientName: string;
  idNumber: string;
  email: string;
  phone: string;
  age: number;
  smoker: boolean;
  employment: string;
  monthlyNetIncome: number;
  entry: "qr" | "link" | "advisor";
  identity: {
    livenessVerified: boolean;
    livenessRef?: string | undefined;
    livenessAt?: string | undefined;
    /** DIDIT request id of the ID document check, or a DEMO reference when it was simulated. */
    idCheckRef?: string | undefined;
    /** True when the check was a demonstration with no live DIDIT call. */
    demo?: boolean | undefined;
    sanctions: "pending" | "clear" | "hit";
  };
  fica: {
    idDocument?: string | undefined;
    proofOfResidence?: string | undefined;
    bankStatement?: string | undefined;
    bankValidatedAt?: string | undefined;
  };
  meetings: { id: string; ts: string; title: string; notes: string }[];
  review: { renewalIssuedAt?: string | undefined; acknowledgedAt?: string | undefined };
  fnaMode: "unset" | "full" | "single-need";
  singleNeed?: { needId: NeedId; amount: number } | undefined;
  signatures: Signature[];
  astute: {
    fetchedAt?: string | undefined;
    policies: ExternalPolicy[];
    alert?: { brokerage: string; detectedAt: string; resolvedAt?: string | undefined } | undefined;
  };
  fna: { inputs: FnaInputs | null; result: FnaResult | null; completedAt?: string | undefined };
  quotes: {
    requestedAt?: string | undefined;
    items: Quote[];
    selectedIds: string[];
    commentary: string;
  };
  roa: RoaVersion[];
  execution: {
    underwritingMode?: "self-service" | "tele" | undefined;
    underwritingLinkSentAt?: string | undefined;
    medicalCompletedAt?: string | undefined;
  };
  applications: Application[];
  annualReviewDue?: string | undefined;
  crmSyncedAt?: string | undefined;
}

/* ---------------------------------------------------------------- Ledger */

export type LedgerType =
  | "CASE_CREATED"
  | "IDENTITY_VERIFIED"
  | "SCREENING"
  | "DOCUMENT_SIGNED"
  | "ASTUTE_PULL"
  | "ASTUTE_ALERT"
  | "FNA_COMPLETED"
  | "QUOTES_GENERATED"
  | "ROA_VERSIONED"
  | "UNDERWRITING"
  | "APPLICATION_SUBMITTED"
  | "POLICY_ISSUED"
  | "APPLICATION_DECLINED"
  | "CRM_SYNC"
  | "NEEDS_ROUTE"
  | "INTEGRATION_RETRY"
  | "MEETING_RECORDED"
  | "FICA_VERIFIED"
  | "RENEWAL_ISSUED"
  | "REVIEW_ACKNOWLEDGED"
  | "GATE_BLOCKED"
  | "REVIEW_SCHEDULED";

export interface LedgerEvent {
  seq: number;
  ts: string;
  caseId: string | null;
  actor: { role: Role | "system"; name: string };
  type: LedgerType;
  summary: string;
  prevHash: string;
  hash: string;
}

/* ------------------------------------------------------------------- Org */

export interface Advisor {
  id: string;
  name: string;
  title: string;
  fsNumber: string;
  active: boolean;
  onboardedAt: string;
}

export interface Fsp {
  name: string;
  fspNumber: string;
  keyIndividual: string;
}

export interface CrmConnection {
  id: "salesforce" | "hubspot";
  name: string;
  detail: string;
  connected: boolean;
  lastSyncAt?: string | undefined;
}

export interface CrmLogEntry {
  id: string;
  ts: string;
  crm: "salesforce" | "hubspot";
  caseId: string;
  clientName: string;
  object: string;
  action: string;
}

export interface QueueItem {
  id: string;
  ts: string;
  target: "astute" | "insurer" | "didit" | "crm";
  caseId: string;
  clientName: string;
  action: string;
  status: "delivered" | "failed";
  attempts: number;
  lastError?: string | undefined;
}

export interface Session {
  role: Role;
  clientCaseId: string;
  insurerId: ProviderId;
}

export interface AppState {
  session: Session;
  fsp: Fsp;
  advisors: Advisor[];
  cases: CaseRecord[];
  ledger: LedgerEvent[];
  crm: CrmConnection[];
  crmLog: CrmLogEntry[];
  queue: QueueItem[];
}
