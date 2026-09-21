/* Domain self-check. Run: npm run check:domain */
import { createHash } from "node:crypto";
import { sha256, hashOf } from "../src/lib/domain/sha256";
import { computeFna, defaultFnaInputs, estateDuty } from "../src/lib/domain/fna";
import { buildSeedState } from "../src/lib/domain/seed";
import { verifyLedger } from "../src/lib/domain/ledger";
import { stageRowsDone } from "../src/lib/domain/lifecycle";
import { getStage, isComplete, quoteGates, submissionGates } from "../src/lib/domain/gates";
import {
  chooseRoute,
  commitCommentary,
  createCase,
  requestQuotes,
  runAstutePull,
  saveFna,
  setCommentary,
  signDocument,
  submitApplication,
  toggleQuote,
  updateProfile,
  verifyIdentity,
} from "../src/lib/domain/engine";

let failed = 0;
const t = (name: string, ok: boolean, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!ok) failed++;
};

// 1. SHA-256 matches Node's crypto
for (const msg of ["", "abc", "The quick brown fox", "R 5 000 000 — ünïcode ✓", "x".repeat(1000)]) {
  t(
    `sha256 vs node crypto (${msg.slice(0, 12) || "empty"})`,
    sha256(msg) === createHash("sha256").update(msg).digest("hex"),
  );
}
t("hashOf key-order independent", hashOf({ a: 1, b: [1, 2] }) === hashOf({ b: [1, 2], a: 1 }));

// 2. Estate duty
const d1 = estateDuty(10_000_000, false); // (10m-3.5m)=6.5m*20% = 1.3m
t("estate duty single R10m", Math.round(d1.duty) === 1_300_000, String(d1.duty));
const d2 = estateDuty(40_000_000, true); // taxable 33m: 30m*20% + 3m*25% = 6.75m
t("estate duty married R40m", Math.round(d2.duty) === 6_750_000, String(d2.duty));

// 3. FNA sanity
const fna = computeFna(38, defaultFnaInputs("married"), "2026-09-21T00:00:00.000Z");
const life = fna.needs.find((n) => n.id === "life")!;
const ip = fna.needs.find((n) => n.id === "disability")!;
t(
  "FNA life gap positive and rounded to R50k",
  life.gap > 0 && life.gap % 50_000 === 0,
  String(life.gap),
);
t(
  "FNA IP: 75% of gross monthly (56,250) less existing 25,000 = 31,500",
  ip.gap === 31_500,
  String(ip.gap),
);
t(
  "FNA deterministic",
  JSON.stringify(fna) ===
    JSON.stringify(computeFna(38, defaultFnaInputs("married"), "2026-09-21T00:00:00.000Z")),
);
const noNeed = computeFna(38, {
  ...defaultFnaInputs("single"),
  dependants: 0,
  bond: 0,
  otherDebts: 0,
  existingLifeCover: 0,
});
t(
  "Single, no dependants, no debt: small life gap",
  noNeed.needs.find((n) => n.id === "life")!.gap < 500_000,
  String(noNeed.needs.find((n) => n.id === "life")!.gap),
);

// 4. Seed builds with a valid ledger and expected stages
const s = buildSeedState();
const v = verifyLedger(s.ledger);
t("seed ledger chain valid", v.ok, `${s.ledger.length} events`);
const names = [
  "Naledi Mokoena",
  "Hugh Carmichael",
  "Sasha Weinberg",
  "Thabo Dlamini",
  "Lindiwe Xaba",
  "Pieter van Wyk",
  "Ayesha Patel",
  "Marcus Jacobs",
];
const stages = names.map((n) => getStage(s.cases.find((c) => c.clientName === n)!)).join(",");
t("stages 1,2,3,4,5,6,6,1", stages === "1,2,3,4,5,6,6,1", stages);
const ayesha = s.cases.find((c) => c.clientName === "Ayesha Patel")!;
t("Ayesha complete with annual review scheduled", isComplete(ayesha) && !!ayesha.annualReviewDue);
const marcus = s.cases.find((c) => c.clientName === "Marcus Jacobs")!;
t("Marcus flagged PEP hit", marcus.identity.sanctions === "hit");
const blocked = s.ledger.filter((e) => e.type === "GATE_BLOCKED").length;
t("blocked attempts recorded in ledger", blocked >= 2, String(blocked));

// 4b. Which line of its current step each seeded client is on (drives the pulsing sub-step)
const rows = (n: string) => {
  const c = s.cases.find((x) => x.clientName === n)!;
  return stageRowsDone(c, getStage(c));
};
t(
  "sub-step: Naledi just arrived, next is Liveness (line 2 of step 1)",
  rows("Naledi Mokoena") === 1,
  String(rows("Naledi Mokoena")),
);
t(
  "sub-step: Hugh at step 2, mandate still locked (next is cross-alert check)",
  rows("Hugh Carmichael") === 2,
  String(rows("Hugh Carmichael")),
);
t(
  "sub-step: Sasha at step 3, nothing captured yet (first line)",
  rows("Sasha Weinberg") === 0,
  String(rows("Sasha Weinberg")),
);
t(
  "sub-step: Thabo at step 4, ROA unsigned (last line current)",
  rows("Thabo Dlamini") === 3,
  String(rows("Thabo Dlamini")),
);
t(
  "sub-step: Lindiwe at step 5, next is FICA documents (line 3)",
  rows("Lindiwe Xaba") === 2,
  String(rows("Lindiwe Xaba")),
);
t(
  "sub-step: Pieter at step 6, insurer decision outstanding (first line)",
  rows("Pieter van Wyk") === 0,
  String(rows("Pieter van Wyk")),
);
t(
  "sub-step: Ayesha issued, next is client acknowledging renewal (last line)",
  rows("Ayesha Patel") === 3,
  String(rows("Ayesha Patel")),
);

// 4c. A database round trip rewrites timestamps (e.g. "+00:00" for "Z"); that must not read as tampering
const roundTripped = structuredClone(s.ledger).map((e) => ({
  ...e,
  ts: e.ts.replace(".000Z", "+00:00"),
}));
t(
  "ledger still verifies after timestamptz round trip",
  roundTripped.some((e) => e.ts.endsWith("+00:00")) && verifyLedger(roundTripped).ok,
);

// 5. Tamper detection
const tampered = structuredClone(s.ledger);
tampered[10]!.summary = "edited after the fact";
const tv = verifyLedger(tampered);
t("tampered entry detected", !tv.ok && tv.brokenAtSeq === tampered[10]!.seq);
const removed = structuredClone(s.ledger);
removed.splice(5, 1);
t("deleted entry detected", !verifyLedger(removed).ok);

// 6. Hard enforcement on a fresh case: try to skip the order
const now = "2026-09-21T10:00:00.000Z";
const r = createCase(s, now, {
  name: "Test Client",
  email: "t@example.co.za",
  phone: "0",
  advisorId: "adv-erin",
});
if (!r.ok) throw new Error("create");
const id = r.caseId;
const c = () => s.cases.find((x) => x.id === id)!;
s.session.role = "advisor";
t("quotes blocked before onboarding", !requestQuotes(s, now, id).ok);
t("astute blocked before LOA", !runAstutePull(s, now, id).ok);
s.session.role = "client";
t("signing blocked before liveness", !signDocument(s, now, id, "disclosure", "Test Client").ok);
updateProfile(s, id, { idNumber: "9001015009087", age: 34, monthlyNetIncome: 50_000 });
t("unknown case rejected", !verifyIdentity(s, now, "nope").ok);
t("liveness ok", verifyIdentity(s, now, id).ok);
t("wrong typed name rejected", !signDocument(s, now, id, "disclosure", "Someone Else").ok);
t("LOA blocked before disclosure", !signDocument(s, now, id, "loa", "Test Client").ok);
t(
  "disclosure signs (name match ignores case/spacing)",
  signDocument(s, now, id, "disclosure", "test  client").ok,
);
t("loa signs", signDocument(s, now, id, "loa", "Test Client").ok);
t("quotes still blocked (no needs route chosen)", !requestQuotes(s, now, id).ok);
s.session.role = "advisor";
chooseRoute(s, now, id, "full");
t("FNA blocked before astute", !saveFna(s, now, id, defaultFnaInputs()).ok);
runAstutePull(s, now, id, true);
t(
  "alert locks portfolio; FNA blocked; stage 2",
  !saveFna(s, now, id, defaultFnaInputs()).ok && getStage(c()) === 2,
);
s.session.role = "client";
t(
  "mandate re-sign resolves alert",
  signDocument(s, now, id, "mandate", "Test Client").ok && !!c().astute.alert?.resolvedAt,
);
s.session.role = "advisor";
t("FNA now runs; stage 4", saveFna(s, now, id, defaultFnaInputs()).ok && getStage(c()) === 4);
t("quotes now allowed", requestQuotes(s, now, id).ok);
const q = c().quotes.items;
const provs = [...new Set(q.map((x) => x.providerId))];
t("quotes span all 6 providers", provs.length === 6, provs.join(","));
toggleQuote(s, now, id, q.find((x) => x.needId === "life" && x.providerId === "sanlam")!.id);
t("submit blocked without ROA signature", !submitApplication(s, now, id).ok);
setCommentary(s, now, id, "Sanlam selected as best value for the client's estate liquidity needs.");
commitCommentary(s, now, id);
const v1 = c().roa.length;
s.session.role = "client";
t(
  "debit order blocked before ROA signed",
  !signDocument(s, now, id, "debit-order", "Test Client").ok,
);
t("ROA signs", signDocument(s, now, id, "roa", "Test Client").ok);
s.session.role = "advisor";
toggleQuote(s, now, id, q.find((x) => x.needId === "life" && x.providerId === "momentum")!.id);
t("selection change creates a new ROA version", c().roa.length === v1 + 1);
t(
  "old ROA signature no longer current",
  submissionGates(c()).find((g) => g.id === "roa")!.met === false,
);
t(
  "quote gates all met",
  quoteGates(c()).every((g) => g.met),
);
t("ledger still valid after all activity", verifyLedger(s.ledger).ok, `${s.ledger.length} events`);

console.log(failed ? `\n${failed} FAILED` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
