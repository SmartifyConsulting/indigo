import { isValidSaId, sameIdNumber } from "../didit";
import { computeFna } from "./fna";
import {
  adviceGates,
  astuteLocked,
  gatesMet,
  hasSig,
  isComplete,
  isVerified as isVerifiedIdentity,
  latestRoa,
  quoteGates,
  roaSigned,
  submissionGates,
  unmet,
} from "./gates";
import { appendEvent } from "./ledger";
import { buildRoaContent, generateQuotes } from "./quotes";
import { hashOf } from "./sha256";
import { pickSignatureFont, syntheticIp } from "./signature-fonts";
import type {
  AppState,
  CaseRecord,
  ExternalPolicy,
  FnaInputs,
  LedgerType,
  NeedId,
  ProviderId,
  Role,
  SignatureKind,
} from "./types";
import { PROVIDERS, SIGNATURE_LABEL, providerName } from "./types";

/**
 * All state transitions live here as plain functions over a mutable draft of AppState.
 * The store clones state, calls one of these, then commits, and the seed data is built by
 * calling the very same functions with a fixed clock. That guarantees seeded cases could
 * really have arrived at their state through the app.
 */

export type Result<T extends object = object> =
  ({ ok: true } & T) | { ok: false; blockers: string[] };
const OK = { ok: true } as const;
const fail = (...blockers: string[]): { ok: false; blockers: string[] } => ({
  ok: false,
  blockers,
});

const uid = (...parts: unknown[]) => hashOf(parts).slice(0, 10);
const SYSTEM = { role: "system" as const, name: "indigro platform" };
const norm = (n: string) => n.trim().toLowerCase().replace(/\s+/g, " ");
export const addYears = (iso: string, y: number) => {
  const d = new Date(iso);
  d.setUTCFullYear(d.getUTCFullYear() + y);
  return d.toISOString();
};

export const findCase = (s: AppState, id: string) => s.cases.find((c) => c.id === id);
export const advisorNameFor = (s: AppState, c: CaseRecord) =>
  s.advisors.find((a) => a.id === c.advisorId)?.name ?? s.advisors[0]!.name;

function actorFor(s: AppState, c?: CaseRecord | null) {
  switch (s.session.role) {
    case "client":
      return { role: "client" as Role, name: c?.clientName ?? "Client" };
    case "advisor":
      return { role: "advisor" as Role, name: c ? advisorNameFor(s, c) : s.advisors[0]!.name };
    case "fsp":
      return { role: "fsp" as Role, name: `${s.fsp.keyIndividual} (KI)` };
    case "insurer":
      return { role: "insurer" as Role, name: providerName(s.session.insurerId) };
  }
}

export function log(
  s: AppState,
  now: string,
  c: CaseRecord | null,
  type: LedgerType,
  summary: string,
  system = false,
) {
  appendEvent(s.ledger, {
    ts: now,
    caseId: c?.id ?? null,
    actor: system ? SYSTEM : actorFor(s, c),
    type,
    summary,
  });
}

function block(s: AppState, now: string, c: CaseRecord, action: string, blockers: string[]) {
  log(s, now, c, "GATE_BLOCKED", `Blocked: ${action}. Unmet: ${blockers.join("; ")}`, true);
  return fail(...blockers);
}

function enqueue(
  s: AppState,
  now: string,
  c: CaseRecord,
  target: "astute" | "insurer" | "didit" | "crm",
  action: string,
  failure?: string,
) {
  s.queue.unshift({
    id: uid("q", c.id, action, now, s.queue.length),
    ts: now,
    target,
    caseId: c.id,
    clientName: c.clientName,
    action,
    status: failure ? "failed" : "delivered",
    attempts: failure ? 1 : 1,
    lastError: failure,
  });
}

function crmPush(s: AppState, now: string, c: CaseRecord, object: string, action: string) {
  const live = s.crm.filter((x) => x.connected);
  if (live.length === 0) return;
  for (const crm of live) {
    s.crmLog.unshift({
      id: uid("crm", c.id, object, crm.id, now),
      ts: now,
      crm: crm.id,
      caseId: c.id,
      clientName: c.clientName,
      object,
      action,
    });
    crm.lastSyncAt = now;
    enqueue(s, now, c, "crm", `${crm.name}: ${action}`);
  }
  c.crmSyncedAt = now;
  log(
    s,
    now,
    c,
    "CRM_SYNC",
    `${object} ${action.toLowerCase()} in ${live.map((l) => l.name).join(" and ")}`,
    true,
  );
}

/* -------------------------------------------------------------- Case setup */

export function createCase(
  s: AppState,
  now: string,
  input: {
    name: string;
    email: string;
    phone: string;
    advisorId: string;
    entry?: CaseRecord["entry"];
  },
): Result<{ caseId: string; code: string }> {
  const name = input.name.trim();
  if (name.length < 3) return fail("Enter the client's full name");
  const id = `c-${uid("case", name, now, s.cases.length)}`;
  const initials = name
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const code = `${initials}-${hashOf(id).slice(0, 4).toUpperCase()}`;

  // A returning client (matched by email) who already cleared identity on another case doesn't
  // need to prove who they are again for a new policy — carry their verification forward.
  const priorVerified = s.cases.find(
    (x) => norm(x.email) === norm(input.email) && isVerifiedIdentity(x),
  );

  const c: CaseRecord = {
    id,
    code,
    createdAt: now,
    advisorId: input.advisorId,
    clientName: name,
    idNumber: priorVerified?.idNumber ?? "",
    email: input.email,
    phone: input.phone,
    age: priorVerified?.age ?? 35,
    smoker: priorVerified?.smoker ?? false,
    employment: priorVerified?.employment ?? "",
    monthlyNetIncome: priorVerified?.monthlyNetIncome ?? 0,
    entry: input.entry ?? "qr",
    identity: priorVerified
      ? { ...priorVerified.identity }
      : { livenessVerified: false, sanctions: "pending" },
    fica: {},
    meetings: [],
    review: {},
    fnaMode: "unset",
    signatures: [],
    astute: { policies: [] },
    fna: { inputs: null, result: null },
    quotes: { items: [], selectedIds: [], commentary: "" },
    roa: [],
    execution: {},
    applications: [],
  };
  s.cases.unshift(c);
  log(
    s,
    now,
    c,
    "CASE_CREATED",
    `Client invitation created via ${c.entry === "qr" ? "QR code" : c.entry === "link" ? "secure link" : "advisor entry"} (${code})`,
  );
  if (priorVerified) {
    log(
      s,
      now,
      c,
      "IDENTITY_VERIFIED",
      `Returning client: identity verification carried over from case ${priorVerified.code}`,
      true,
    );
  }
  return { ok: true, caseId: id, code };
}

export function updateProfile(
  s: AppState,
  caseId: string,
  patch: Partial<
    Pick<
      CaseRecord,
      "idNumber" | "age" | "smoker" | "employment" | "monthlyNetIncome" | "phone" | "email"
    >
  >,
): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  Object.assign(c, patch);
  return OK;
}

/* ------------------------------------------------------------ Stage 1 */

/** The client clicks the link in their invite email and confirms it's theirs. */
export function verifyClientEmail(s: AppState, now: string, caseId: string): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (c.identity.emailVerifiedAt) return OK;
  c.identity.emailVerifiedAt = now;
  log(s, now, c, "EMAIL_VERIFIED", `Client verified their email address (${c.email})`, true);
  return OK;
}

export function verifyIdentity(s: AppState, now: string, caseId: string): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (!c.identity.emailVerifiedAt) {
    return block(s, now, c, "verify identity", ["Client must verify their email address first"]);
  }
  if (!c.idNumber || c.idNumber.replace(/\D/g, "").length !== 13) {
    return fail("Enter a valid 13-digit South African ID number first");
  }
  const ref = `DIDIT-${uid("liveness", c.id, now).toUpperCase().slice(0, 8)}`;
  c.identity.livenessVerified = true;
  c.identity.livenessRef = ref;
  c.identity.livenessAt = now;
  enqueue(s, now, c, "didit", "Liveness and Home Affairs ID verification");
  log(
    s,
    now,
    c,
    "IDENTITY_VERIFIED",
    `Liveness passed and ID matched to Home Affairs register (${ref})`,
    true,
  );
  runScreening(s, now, c);
  return OK;
}

/** L0 sanctions and PEP screen (simulated: a name containing "PEP" returns a match). */
function runScreening(s: AppState, now: string, c: CaseRecord) {
  const hit = /\b(pep|sanction)/i.test(c.clientName);
  c.identity.sanctions = hit ? "hit" : "clear";
  log(
    s,
    now,
    c,
    "SCREENING",
    hit
      ? "L0 sanctions / PEP screening returned a potential match. Escalated to the Key Individual; onboarding halted"
      : "L0 sanctions and PEP screening clear (no matches in UN, OFAC, local PEP lists)",
    true,
  );
}

/**
 * Record a completed identity check from the client's own wizard: the ID document was read and
 * the selfie passed liveness (both with DIDIT, or simulated when `demo`). No images are kept.
 * The ID number read from the document must be a valid South African ID and match the one on file.
 */
export function recordIdentityCheck(
  s: AppState,
  now: string,
  caseId: string,
  input: {
    documentNumber: string | null;
    idRequestId: string | null;
    livenessRequestId: string | null;
    demo: boolean;
  },
): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (!c.identity.emailVerifiedAt) {
    return block(s, now, c, "verify identity", ["Client must verify their email address first"]);
  }
  const number = input.documentNumber ?? "";
  if (!isValidSaId(number.replace(/\D/g, ""))) {
    return block(s, now, c, "verify identity", [
      "The ID number on the document is not a valid South African ID number",
    ]);
  }
  const digits = number.replace(/\D/g, "");
  if (c.idNumber && !sameIdNumber(c.idNumber, digits)) {
    return block(s, now, c, "verify identity", [
      "The ID document does not match the ID number on file",
    ]);
  }
  c.idNumber = digits;
  const ref = input.demo
    ? `DEMO-${uid("liveness", c.id, now).toUpperCase().slice(0, 8)}`
    : `DIDIT-${(input.livenessRequestId ?? uid("liveness", c.id, now)).replace(/-/g, "").toUpperCase().slice(0, 8)}`;
  c.identity.livenessVerified = true;
  c.identity.livenessRef = ref;
  c.identity.livenessAt = now;
  c.identity.idCheckRef = input.idRequestId ?? undefined;
  c.identity.demo = input.demo;
  enqueue(s, now, c, "didit", "ID document and liveness verification");
  log(
    s,
    now,
    c,
    "IDENTITY_VERIFIED",
    input.demo
      ? `DEMO: ID and liveness simulated, no live DIDIT check was made (${ref})`
      : `ID document verified and liveness passed with DIDIT (${ref})`,
    true,
  );
  runScreening(s, now, c);
  return OK;
}

/** Record that the identity service declined a check, so the reason is on the audit trail. */
export function recordIdentityFailure(
  s: AppState,
  now: string,
  caseId: string,
  reason: string,
): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  return block(s, now, c, "verify identity", [reason]);
}

const SIG_NEEDS_IDENTITY: SignatureKind[] = ["disclosure", "loa"];

export function signDocument(
  s: AppState,
  now: string,
  caseId: string,
  kind: SignatureKind,
  typedName: string,
): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (norm(typedName) !== norm(c.clientName)) {
    return fail(`Type the client's full legal name exactly as shown: ${c.clientName}`);
  }
  const roaBound = kind === "roa" || kind === "debit-order" || kind === "life-declaration";
  const v = latestRoa(c);

  // Sequential-order enforcement ------------------------------------------
  const blockers: string[] = [];
  if (SIG_NEEDS_IDENTITY.includes(kind)) {
    if (!c.identity.livenessVerified) blockers.push("Liveness and ID verification");
    if (c.identity.sanctions === "hit")
      blockers.push("Sanctions/PEP match must be cleared by the Key Individual");
    else if (c.identity.sanctions !== "clear") blockers.push("L0 sanctions and PEP screening");
    if (kind === "loa" && !hasSig(c, "disclosure")) blockers.push("Pre-quote advisor disclosure");
  }
  if (kind === "single-need") {
    if (c.fnaMode !== "single-need") blockers.push("Client must choose the single-need route");
    if (!gatesMet(adviceGates(c))) blockers.push(...unmet(adviceGates(c)));
  }
  if (kind === "mandate" && !(c.astute.alert && !c.astute.alert.resolvedAt)) {
    blockers.push("No open Astute cross-alert requires a new mandate");
  }
  if (kind === "roa") {
    if (!v) blockers.push("An ROA must be generated first (select quotes)");
    else if (v.content.commentary.length < 20)
      blockers.push("Advisor commentary and affordability assessment");
    if (!gatesMet(adviceGates(c))) blockers.push(...unmet(adviceGates(c)));
  }
  if ((kind === "debit-order" || kind === "life-declaration") && !roaSigned(c)) {
    blockers.push("Current ROA signed by the client");
  }
  if (blockers.length) return block(s, now, c, `sign ${SIGNATURE_LABEL[kind]}`, blockers);

  // Idempotence ------------------------------------------------------------
  const already = c.signatures.some(
    (x) => x.kind === kind && (roaBound ? x.roaVersion === v?.version : true),
  );
  if (already && kind !== "mandate") return OK;

  const docHash = hashOf(
    roaBound ? { kind, roa: v?.hash } : { kind, client: c.id, template: "v1.0" },
  );
  const sigId = uid("sig", c.id, kind, now);
  const otherFonts = c.signatures
    .filter((x) => x.kind === kind && (roaBound ? x.roaVersion === v?.version : true))
    .map((x) => x.font);
  c.signatures.push({
    id: sigId,
    kind,
    signerName: c.clientName,
    signedAt: now,
    docHash,
    roaVersion: roaBound ? v?.version : undefined,
    font: pickSignatureFont(sigId, otherFonts[otherFonts.length - 1]),
    ipAddress: syntheticIp(sigId),
  });
  log(
    s,
    now,
    c,
    "DOCUMENT_SIGNED",
    `${SIGNATURE_LABEL[kind]} e-signed${roaBound && v ? ` (ROA v${v.version})` : ""}. Document fingerprint ${docHash.slice(0, 12)}`,
  );

  if (kind === "mandate" && c.astute.alert) {
    c.astute.alert.resolvedAt = now;
    log(
      s,
      now,
      c,
      "ASTUTE_ALERT",
      `Cross-alert resolved: updated authority mandate signed. Portfolio data for ${c.clientName} unlocked`,
      true,
    );
    crmPush(s, now, c, "Existing policy schedule", "Synced");
  }
  if (SIG_NEEDS_IDENTITY.includes(kind) && gatesMet(adviceGates(c))) {
    crmPush(s, now, c, "Client profile", "Created");
  }
  return OK;
}

export function chooseRoute(
  s: AppState,
  now: string,
  caseId: string,
  mode: "full" | "single-need",
  singleNeed?: { needId: NeedId; amount: number },
): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (mode === "single-need" && (!singleNeed || singleNeed.amount <= 0))
    return fail("Enter the single need and amount the client wants quoted");
  c.fnaMode = mode;
  c.singleNeed = mode === "single-need" ? singleNeed : undefined;
  log(
    s,
    now,
    c,
    "NEEDS_ROUTE",
    mode === "full"
      ? "Client accepted a full financial needs analysis"
      : `Client declined a full needs analysis and requested a single need only (${singleNeed!.needId}). Disclaimer required`,
  );
  return OK;
}

/* ------------------------------------------------------------ Stage 2 */

const POLICY_POOL: Omit<ExternalPolicy, "id" | "reference">[] = [
  { provider: "Sanlam", type: "Life", value: 1_500_000, monthlyPremium: 640 },
  { provider: "Old Mutual", type: "Disability", value: 18_000, monthlyPremium: 520 },
  { provider: "Discovery", type: "Severe illness", value: 500_000, monthlyPremium: 470 },
  { provider: "Allan Gray", type: "Unit trust", value: 640_000, monthlyPremium: 3_000 },
  { provider: "Liberty", type: "Retirement annuity", value: 410_000, monthlyPremium: 2_500 },
  { provider: "Momentum", type: "Endowment", value: 280_000, monthlyPremium: 1_200 },
  { provider: "Santam", type: "Vehicle", value: 380_000, monthlyPremium: 1_750, claims: 1 },
  { provider: "Auto & General", type: "Household", value: 720_000, monthlyPremium: 890, claims: 0 },
];
const BROKERAGES = ["Coastal Financial Brokers", "Highveld Wealth Partners", "Karoo Risk Advisory"];

export function runAstutePull(
  s: AppState,
  now: string,
  caseId: string,
  forceAlert?: boolean,
): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  const gates = adviceGates(c);
  if (!gatesMet(gates)) return block(s, now, c, "Astute portfolio pull", unmet(gates));
  if (c.astute.fetchedAt) return OK;

  const h = hashOf(["astute", c.id]);
  const picked = POLICY_POOL.filter((_, i) => parseInt(h[i]!, 16) % 2 === 0);
  const policies = (picked.length >= 3 ? picked : POLICY_POOL.slice(0, 4)).map((p, i) => ({
    ...p,
    id: uid("pol", c.id, i),
    reference: `${p.provider.slice(0, 3).toUpperCase()}-${hashOf([c.id, p.provider]).slice(0, 7).toUpperCase()}`,
  }));
  c.astute.fetchedAt = now;
  c.astute.policies = policies;
  enqueue(s, now, c, "astute", "Portfolio pull (life, disability, investments)");
  enqueue(s, now, c, "insurer", "Short-term policy schedules and claims history");
  log(
    s,
    now,
    c,
    "ASTUTE_PULL",
    `Astute Exchange returned ${policies.length} existing products under the signed Letter of Authority; short-term schedules and claims history fetched from insurers`,
    true,
  );

  const alerted = forceAlert ?? parseInt(h[0]!, 16) % 4 === 0;
  if (alerted) {
    const brokerage = BROKERAGES[parseInt(h[1]!, 16) % BROKERAGES.length]!;
    c.astute.alert = { brokerage, detectedAt: now };
    log(
      s,
      now,
      c,
      "ASTUTE_ALERT",
      `Cross-alert: ${brokerage} queried Astute for ${c.clientName}. Portfolio data locked until the client signs an updated authority mandate`,
      true,
    );
  } else {
    crmPush(s, now, c, "Existing policy schedule", "Synced");
  }
  return OK;
}

/**
 * Records an existing policy the advisor has verified directly from the client's own documents
 * (a policy schedule or statement), rather than through the automated Astute pull. Marks the
 * portfolio as retrieved if it wasn't already, so the policy shows up alongside anything Astute
 * later returns.
 */
export function addExternalPolicy(
  s: AppState,
  now: string,
  caseId: string,
  input: Omit<ExternalPolicy, "id">,
): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (!input.provider.trim() || !input.reference.trim()) {
    return fail("Enter the provider and a reference or policy number");
  }
  if (!c.astute.fetchedAt) c.astute.fetchedAt = now;
  c.astute.policies.push({ ...input, id: uid("pol", c.id, input.reference, now) });
  log(
    s,
    now,
    c,
    "ASTUTE_PULL",
    `${input.provider} ${input.type.toLowerCase()} policy captured from the client's documents (${input.reference})`,
    true,
  );
  return OK;
}

/* ------------------------------------------------------------ Stage 3 */

export function saveFna(s: AppState, now: string, caseId: string, inputs: FnaInputs): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  const blockers = [...unmet(adviceGates(c))];
  if (c.fnaMode !== "full") blockers.push("Client has not chosen a full needs analysis");
  if (!c.astute.fetchedAt) blockers.push("Existing portfolio retrieved from Astute");
  else if (astuteLocked(c)) blockers.push("Astute cross-alert resolved (updated mandate signed)");
  if (blockers.length) return block(s, now, c, "run needs analysis", blockers);

  const result = computeFna(c.age, inputs, now);
  const hadQuotes = c.quotes.items.length > 0;
  c.fna = { inputs, result, completedAt: now };
  if (hadQuotes) {
    c.quotes = { ...c.quotes, requestedAt: undefined, items: [], selectedIds: [] };
  }
  const total = result.needs.filter((n) => n.gap > 0).length;
  log(
    s,
    now,
    c,
    "FNA_COMPLETED",
    `Needs analysis completed: ${total} gaps identified across life, short-term and investments${hadQuotes ? ". Previous quotes withdrawn" : ""}`,
  );
  return OK;
}

/* ------------------------------------------------------------ Stage 4 */

export function requestQuotes(s: AppState, now: string, caseId: string): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  const gates = quoteGates(c);
  if (!gatesMet(gates)) return block(s, now, c, "request insurer quotes", unmet(gates));
  const items = generateQuotes(c);
  if (items.length === 0) return fail("There are no quotable gaps to send to insurers");
  c.quotes.items = items;
  c.quotes.selectedIds = [];
  c.quotes.requestedAt = now;
  const providers = new Set(items.map((q) => q.providerId));
  enqueue(s, now, c, "insurer", `Quote requests to ${providers.size} insurers`);
  log(
    s,
    now,
    c,
    "QUOTES_GENERATED",
    `${items.length} quotes received from ${[...providers].map(providerName).join(", ")}`,
    true,
  );
  return OK;
}

function rebuildRoa(s: AppState, now: string, c: CaseRecord) {
  if (c.quotes.selectedIds.length === 0) return;
  const content = buildRoaContent(c, advisorNameFor(s, c), s.fsp.name);
  const hash = hashOf(content);
  const prev = latestRoa(c);
  if (prev?.hash === hash) return;
  const version = (prev?.version ?? 0) + 1;
  c.roa.push({ version, createdAt: now, hash, content });
  const wasSigned =
    prev && c.signatures.some((x) => x.kind === "roa" && x.roaVersion === prev.version);
  log(
    s,
    now,
    c,
    "ROA_VERSIONED",
    `Record of Advice v${version} generated (${content.recommendations.length} products, R${content.totalMonthlyPremium.toLocaleString("en-ZA")} a month, affordability ${content.affordability}).${wasSigned ? " Previous signature superseded: client must re-sign" : ""}`,
    true,
  );
}

export function toggleQuote(s: AppState, now: string, caseId: string, quoteId: string): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (c.applications.length > 0) return fail("Application already submitted");
  const q = c.quotes.items.find((x) => x.id === quoteId);
  if (!q) return fail("Quote not found");
  const on = c.quotes.selectedIds.includes(quoteId);
  // one provider per need
  c.quotes.selectedIds = c.quotes.selectedIds.filter((id) => {
    if (id === quoteId) return false;
    return c.quotes.items.find((x) => x.id === id)?.needId !== q.needId;
  });
  if (!on) c.quotes.selectedIds.push(quoteId);
  if (c.quotes.selectedIds.length === 0) return OK;
  rebuildRoa(s, now, c);
  return OK;
}

export function setCommentary(s: AppState, now: string, caseId: string, text: string): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (c.applications.length > 0) return fail("Application already submitted");
  c.quotes.commentary = text;
  return OK;
}

/** Commit commentary and regenerate the ROA (called on blur / explicit save, not on every keystroke). */
export function commitCommentary(s: AppState, now: string, caseId: string): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  rebuildRoa(s, now, c);
  return OK;
}

export function recordMeeting(
  s: AppState,
  now: string,
  caseId: string,
  title: string,
  notes: string,
): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (title.trim().length < 3) return fail("Give the meeting a title");
  c.meetings.unshift({
    id: uid("mtg", c.id, now),
    ts: now,
    title: title.trim(),
    notes: notes.trim(),
  });
  log(s, now, c, "MEETING_RECORDED", `Meeting recorded: ${title.trim()}`);
  return OK;
}

/* ------------------------------------------------------------ Stage 5 */

export function uploadFica(
  s: AppState,
  now: string,
  caseId: string,
  doc: "idDocument" | "proofOfResidence" | "bankStatement",
  filename: string,
): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  c.fica[doc] = filename;
  c.fica.bankValidatedAt = undefined;
  return OK;
}

export function validateBank(s: AppState, now: string, caseId: string): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  const missing = [
    !c.fica.idDocument && "ID document",
    !c.fica.proofOfResidence && "Proof of residence",
    !c.fica.bankStatement && "Bank statement",
  ].filter(Boolean) as string[];
  if (missing.length) return fail(`Still needed: ${missing.join(", ")}`);
  c.fica.bankValidatedAt = now;
  enqueue(s, now, c, "didit", "Bank account verification and proof of residence check");
  log(
    s,
    now,
    c,
    "FICA_VERIFIED",
    "ID, proof of residence and bank account validated; final FICA screening logged with no adverse findings",
    true,
  );
  return OK;
}

export function sendUnderwritingLink(
  s: AppState,
  now: string,
  caseId: string,
  mode: "self-service" | "tele",
): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  c.execution.underwritingMode = mode;
  c.execution.underwritingLinkSentAt = now;
  log(
    s,
    now,
    c,
    "UNDERWRITING",
    mode === "self-service"
      ? "Encrypted health-disclosure link sent to the client portal"
      : "Client asked for provider tele-underwriting. Referral sent to insurer call centre",
  );
  return OK;
}

export function completeMedical(s: AppState, now: string, caseId: string): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (!c.execution.underwritingLinkSentAt) return fail("No underwriting link has been issued");
  c.execution.medicalCompletedAt = now;
  log(
    s,
    now,
    c,
    "UNDERWRITING",
    "Client completed the encrypted health disclosure. Answers went to the insurers' underwriting systems and are not held by the advisor or FSP",
  );
  return OK;
}

export function submitApplication(s: AppState, now: string, caseId: string): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (c.applications.length > 0) return OK;
  const gates = submissionGates(c);
  if (!gatesMet(gates)) return block(s, now, c, "submit application to insurers", unmet(gates));
  const selected = c.quotes.items.filter((q) => c.quotes.selectedIds.includes(q.id));
  c.applications = selected.map((q) => ({
    quoteId: q.id,
    providerId: q.providerId,
    product: q.product,
    needsMedical: q.underwriting === "medical",
    status: "submitted" as const,
    submittedAt: now,
  }));
  enqueue(
    s,
    now,
    c,
    "insurer",
    `Application pack to ${new Set(selected.map((q) => q.providerId)).size} insurers`,
  );
  log(
    s,
    now,
    c,
    "APPLICATION_SUBMITTED",
    `Application submitted: ${selected.map((q) => `${providerName(q.providerId)} ${q.product}`).join("; ")}`,
  );
  if (c.applications.some((a) => a.needsMedical) && !c.execution.underwritingLinkSentAt) {
    sendUnderwritingLink(s, now, caseId, "self-service");
  }
  return OK;
}

/* ------------------------------------------------------------ Stage 6 */

export function insurerDecision(
  s: AppState,
  now: string,
  caseId: string,
  quoteId: string,
  decision: "issue" | "decline",
): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  const app = c.applications.find((a) => a.quoteId === quoteId);
  if (!app) return fail("Application not found");
  if (app.status !== "submitted") return OK;
  if (s.session.insurerId !== app.providerId)
    return fail(`This application belongs to ${providerName(app.providerId)}`);
  if (decision === "issue" && app.needsMedical && !c.execution.medicalCompletedAt) {
    return block(s, now, c, `issue ${app.product}`, ["Client's medical disclosure is outstanding"]);
  }
  app.decidedAt = now;
  if (decision === "decline") {
    app.status = "declined";
    log(
      s,
      now,
      c,
      "APPLICATION_DECLINED",
      `${providerName(app.providerId)} declined ${app.product}`,
    );
  } else {
    app.status = "issued";
    const prefix = PROVIDERS.find((p) => p.id === app.providerId)!
      .name.replace(/[^A-Za-z]/g, "")
      .slice(0, 3)
      .toUpperCase();
    app.policyNumber = `${prefix}-${hashOf([c.id, quoteId]).slice(0, 8).toUpperCase()}`;
    log(
      s,
      now,
      c,
      "POLICY_ISSUED",
      `${providerName(app.providerId)} accepted the risk and issued ${app.product} (${app.policyNumber}). Policy schedule sent to the client portal`,
    );
  }
  if (isComplete(c) && c.applications.some((a) => a.status === "issued")) {
    c.annualReviewDue = addYears(now, 1);
    log(
      s,
      now,
      c,
      "REVIEW_SCHEDULED",
      `Annual review scheduled for ${c.annualReviewDue.slice(0, 10)}. Compliance file locked to the audit vault`,
      true,
    );
    crmPush(s, now, c, "Policy schedule and annual review date", "Synced");
  }
  return OK;
}

export function issueRenewal(s: AppState, now: string, caseId: string): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (!c.annualReviewDue) return fail("No annual review has been scheduled");
  c.review.renewalIssuedAt = now;
  c.review.acknowledgedAt = undefined;
  log(
    s,
    now,
    c,
    "RENEWAL_ISSUED",
    "Renewal schedule and change disclosures issued to the client for the annual review",
  );
  return OK;
}

export function acknowledgeReview(s: AppState, now: string, caseId: string): Result {
  const c = findCase(s, caseId);
  if (!c) return fail("Case not found");
  if (!c.review.renewalIssuedAt) return fail("No renewal schedule has been issued");
  c.review.acknowledgedAt = now;
  log(
    s,
    now,
    c,
    "REVIEW_ACKNOWLEDGED",
    "Client acknowledged the renewal schedule and change disclosures",
  );
  return OK;
}

/* ------------------------------------------------------------ Integrations */

export function setCrmConnected(
  s: AppState,
  id: "salesforce" | "hubspot",
  connected: boolean,
): Result {
  const crm = s.crm.find((x) => x.id === id);
  if (!crm) return fail("Unknown CRM");
  crm.connected = connected;
  return OK;
}

export function retryQueueItem(s: AppState, now: string, itemId: string): Result {
  const item = s.queue.find((q) => q.id === itemId);
  if (!item) return fail("Queue item not found");
  if (item.status === "delivered") return OK;
  item.attempts += 1;
  item.status = "delivered";
  item.lastError = undefined;
  const c = findCase(s, item.caseId) ?? null;
  log(
    s,
    now,
    c,
    "INTEGRATION_RETRY",
    `Retry ${item.attempts} succeeded for ${item.target}: ${item.action}`,
    true,
  );
  return OK;
}

export const providerOptions = (): { id: ProviderId; name: string }[] =>
  PROVIDERS.map((p) => ({ id: p.id, name: p.name }));
