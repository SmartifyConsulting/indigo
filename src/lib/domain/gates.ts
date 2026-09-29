import type { CaseRecord, SignatureKind } from "./types";

/**
 * Compliance gates: the regulatory order of operations, enforced in code. Every store
 * action that advances a case calls one of these and refuses (and logs a blocked attempt
 * to the ledger) if a gate is unmet. Nothing on the UI side is the only line of defence.
 */

export interface Gate {
  id: string;
  label: string;
  met: boolean;
  detail?: string | undefined;
}

export const hasSig = (c: CaseRecord, kind: SignatureKind) =>
  c.signatures.some((s) => s.kind === kind);

export const latestRoa = (c: CaseRecord) => c.roa[c.roa.length - 1];

/** Kinds that are bound to a specific ROA version and lapse when the ROA is re-versioned. */
export const ROA_BOUND: SignatureKind[] = ["roa", "debit-order", "life-declaration"];

export const sigCurrent = (c: CaseRecord, kind: SignatureKind) => {
  const v = latestRoa(c);
  return !!v && c.signatures.some((s) => s.kind === kind && s.roaVersion === v.version);
};

export const roaSigned = (c: CaseRecord) => sigCurrent(c, "roa");

export const ficaComplete = (c: CaseRecord) =>
  !!(
    c.fica.idDocument &&
    c.fica.proofOfResidence &&
    c.fica.bankStatement &&
    c.fica.bankValidatedAt
  );

export const astuteLocked = (c: CaseRecord) => !!c.astute.alert && !c.astute.alert.resolvedAt;

/** Full identity clearance: liveness/ID passed and sanctions screening came back clean. */
export const isVerified = (c: CaseRecord) =>
  c.identity.livenessVerified && c.identity.sanctions === "clear";

/** Gate 1: identity, screening and mandates that must exist before any advice is given. */
export function adviceGates(c: CaseRecord): Gate[] {
  return [
    {
      id: "email-verified",
      label: "Client verified their email address",
      met: !!c.identity.emailVerifiedAt,
    },
    {
      id: "liveness",
      label: "Liveness and ID verified (Home Affairs / DIDIT)",
      met: c.identity.livenessVerified,
    },
    {
      id: "sanctions",
      label: "L0 sanctions and PEP screening clear",
      met: c.identity.sanctions === "clear",
      detail:
        c.identity.sanctions === "hit"
          ? "Potential match: escalated to the Key Individual"
          : undefined,
    },
    {
      id: "disclosure",
      label: "Pre-quote advisor disclosure signed",
      met: hasSig(c, "disclosure"),
    },
    { id: "loa", label: "Letter of Authority signed", met: hasSig(c, "loa") },
  ];
}

/** Gate 2: everything required before quotes may be requested from insurers. */
export function quoteGates(c: CaseRecord): Gate[] {
  const gates = adviceGates(c);
  const fnaOk =
    c.fnaMode === "full"
      ? !!c.fna.result
      : c.fnaMode === "single-need"
        ? hasSig(c, "single-need") && !!c.singleNeed
        : false;
  gates.push({
    id: "needs",
    label:
      c.fnaMode === "single-need"
        ? "Signed single-need disclaimer"
        : "Financial needs analysis completed",
    met: fnaOk,
    detail:
      c.fnaMode === "unset"
        ? "Client has not chosen a full analysis or a single need yet"
        : undefined,
  });
  gates.push({
    id: "astute",
    label: "Astute cross-alert resolved (updated mandate signed)",
    met: !astuteLocked(c),
    detail: astuteLocked(c)
      ? `${c.astute.alert!.brokerage} queried this client. Portfolio data stays locked until the mandate is re-signed.`
      : undefined,
  });
  return gates;
}

/** Gate 3: everything required before the application is submitted to insurers. */
export function submissionGates(c: CaseRecord): Gate[] {
  const hasLifeQuote = c.quotes.items.some(
    (q) =>
      c.quotes.selectedIds.includes(q.id) &&
      ["life", "disability", "severe-illness"].includes(q.needId),
  );
  const v = latestRoa(c);
  return [
    { id: "selection", label: "At least one quote selected", met: c.quotes.selectedIds.length > 0 },
    {
      id: "commentary",
      label: "Advisor commentary and affordability assessment recorded",
      met: !!v && v.content.commentary.length >= 20,
      detail: "Commentary must be at least 20 characters",
    },
    {
      id: "fica",
      label: "FICA documents and bank details validated (ID, proof of residence, bank statement)",
      met: ficaComplete(c),
    },
    {
      id: "roa",
      label: `Current ROA${v ? ` (v${v.version})` : ""} signed by the client`,
      met: roaSigned(c),
    },
    { id: "debit", label: "Debit order mandate signed", met: sigCurrent(c, "debit-order") },
    ...(hasLifeQuote
      ? [
          {
            id: "declaration",
            label: "Life declaration signed",
            met: sigCurrent(c, "life-declaration"),
          },
        ]
      : []),
  ];
}

export const gatesMet = (gates: Gate[]) => gates.every((g) => g.met);
export const unmet = (gates: Gate[]) => gates.filter((g) => !g.met).map((g) => g.label);

/** The stage is derived from case data, never stored, so it cannot drift from reality. */
export type StageNo = 1 | 2 | 3 | 4 | 5 | 6;

export const STAGES: { no: StageNo; title: string; short: string }[] = [
  { no: 1, title: "Client onboarding", short: "Onboarding" },
  { no: 2, title: "Portfolio aggregation & CRM sync", short: "Portfolio" },
  { no: 3, title: "Wealth & risk needs analysis", short: "Needs analysis" },
  { no: 4, title: "Multi-quote generation & ROA", short: "Quotes & ROA" },
  { no: 5, title: "Client presentation & submission", short: "Presentation" },
  { no: 6, title: "Issuance, audit & annual review", short: "Issuance" },
];

export function getStage(c: CaseRecord): StageNo {
  if (!gatesMet(adviceGates(c)) || c.fnaMode === "unset") return 1;
  if (c.fnaMode === "full") {
    if (!c.astute.fetchedAt || astuteLocked(c)) return 2;
    if (!c.fna.result) return 3;
  }
  if (c.fnaMode === "single-need" && !hasSig(c, "single-need")) return 1;
  if (c.applications.length === 0) return roaSigned(c) ? 5 : 4;
  return 6;
}

export const isComplete = (c: CaseRecord) =>
  c.applications.length > 0 && c.applications.every((a) => a.status !== "submitted");
