import { defaultFnaInputs } from "./fna";
import {
  chooseRoute,
  commitCommentary,
  completeMedical,
  createCase,
  findCase,
  insurerDecision,
  recordMeeting,
  requestQuotes,
  runAstutePull,
  saveFna,
  signDocument,
  submitApplication,
  toggleQuote,
  setCommentary,
  updateProfile,
  uploadFica,
  validateBank,
  verifyIdentity,
} from "./engine";
import type { AppState, CaseRecord, FnaInputs, Role } from "./types";

const ADV = { erin: "adv-erin", lwazi: "adv-lwazi", priya: "adv-priya" } as const;

function emptyState(): AppState {
  return {
    session: { role: "advisor", clientCaseId: "", insurerId: "momentum" },
    fsp: {
      name: "Cape Meridian Financial Services (Pty) Ltd",
      fspNumber: "FSP 47281",
      keyIndividual: "Sipho Nkosi",
    },
    advisors: [
      {
        id: ADV.erin,
        name: "Erin Kruger",
        title: "Senior Wealth Manager",
        fsNumber: "FA 118204",
        active: true,
        onboardedAt: "2024-02-12T08:00:00.000Z",
      },
      {
        id: ADV.lwazi,
        name: "Lwazi Mthembu",
        title: "Wealth Manager",
        fsNumber: "FA 129771",
        active: true,
        onboardedAt: "2025-01-20T08:00:00.000Z",
      },
      {
        id: ADV.priya,
        name: "Priya Naidoo",
        title: "Financial Advisor",
        fsNumber: "FA 134410",
        active: true,
        onboardedAt: "2025-08-04T08:00:00.000Z",
      },
      {
        id: "adv-jaco",
        name: "Jaco Steyn",
        title: "Financial Advisor (on leave)",
        fsNumber: "FA 101956",
        active: false,
        onboardedAt: "2023-05-15T08:00:00.000Z",
      },
    ],
    cases: [],
    ledger: [],
    crm: [
      {
        id: "salesforce",
        name: "Salesforce Financial Services Cloud",
        detail: "Sandbox org: cape-meridian.my.salesforce.com",
        connected: true,
      },
      { id: "hubspot", name: "HubSpot CRM", detail: "Portal 48120933", connected: false },
    ],
    crmLog: [],
    queue: [],
  };
}

export function buildSeedState(): AppState {
  const s = emptyState();
  let t = Date.parse("2026-08-25T07:30:00.000Z");
  const tick = (mins = 7) => new Date((t += mins * 60_000)).toISOString();
  const as = (role: Role) => {
    s.session.role = role;
  };
  const named = (name: string) => s.cases.find((c) => c.clientName === name)!;

  const mk = (name: string, advisorId: string, email: string, phone: string) => {
    as("advisor");
    const r = createCase(s, tick(60), { name, email, phone, advisorId, entry: "qr" });
    if (!r.ok) throw new Error("seed failed");
    return findCase(s, r.caseId)!;
  };

  const onboard = (
    c: CaseRecord,
    p: { id: string; age: number; smoker?: boolean; net: number; job: string },
  ) => {
    updateProfile(s, c.id, {
      idNumber: p.id,
      age: p.age,
      smoker: !!p.smoker,
      monthlyNetIncome: p.net,
      employment: p.job,
    });
    as("client");
    verifyIdentity(s, tick(), c.id);
    signDocument(s, tick(), c.id, "disclosure", c.clientName);
    signDocument(s, tick(), c.id, "loa", c.clientName);
  };

  const inputs = (over: Partial<FnaInputs> = {}): FnaInputs => ({
    ...defaultFnaInputs("married"),
    ...over,
  });

  /* 1 · Stage 1: invited, nothing done yet */
  mk("Naledi Mokoena", ADV.erin, "naledi.mokoena@example.co.za", "082 555 0101");

  /* 2 · Stage 2: onboarded, Astute cross-alert locks the portfolio */
  const hugh = mk("Hugh Carmichael", ADV.erin, "hugh.carmichael@example.co.za", "083 555 0142");
  onboard(hugh, { id: "7803155009083", age: 48, net: 88_000, job: "Company director" });
  as("advisor");
  chooseRoute(s, tick(), hugh.id, "full");
  runAstutePull(s, tick(), hugh.id, true);
  requestQuotes(s, tick(), hugh.id); // blocked attempt, logged for the KI

  /* 3 · Stage 3: portfolio retrieved, needs analysis outstanding */
  const sasha = mk("Sasha Weinberg", ADV.erin, "sasha.weinberg@example.co.za", "084 555 0177");
  onboard(sasha, { id: "8511220211087", age: 41, net: 72_000, job: "Attorney" });
  as("advisor");
  chooseRoute(s, tick(), sasha.id, "full");
  runAstutePull(s, tick(), sasha.id, false);
  recordMeeting(
    s,
    tick(30),
    sasha.id,
    "Discovery meeting",
    "Reviewed existing cover; client wants estate liquidity addressed and offshore exposure increased.",
  );

  /* Advisor attempts to pull a portfolio before mandates are signed (blocked, logged) */
  as("advisor");
  s.session.role = "advisor";
  runAstutePull(s, tick(), named("Naledi Mokoena").id, false);

  /* 4 · Stage 4: quotes selected, ROA v1 awaiting client signature */
  const thabo = mk("Thabo Dlamini", ADV.erin, "thabo.dlamini@example.co.za", "079 555 0113");
  onboard(thabo, { id: "8906105123082", age: 36, net: 58_000, job: "Civil engineer" });
  as("advisor");
  chooseRoute(s, tick(), thabo.id, "full");
  runAstutePull(s, tick(), thabo.id, false);
  saveFna(
    s,
    tick(),
    thabo.id,
    inputs({
      grossAnnualIncome: 780_000,
      monthlyExpenses: 38_000,
      existingLifeCover: 1_000_000,
      bond: 1_650_000,
    }),
  );
  requestQuotes(s, tick(), thabo.id);
  toggleQuote(s, tick(), thabo.id, `${thabo.id}:old-mutual:life`);
  toggleQuote(s, tick(), thabo.id, `${thabo.id}:momentum:disability`);
  setCommentary(
    s,
    tick(),
    thabo.id,
    "Old Mutual gives the lowest life premium; Momentum's own-occupation income protection suits an engineer. Premiums total under 15% of net income.",
  );
  commitCommentary(s, tick(), thabo.id);

  /* 5 · Stage 5: ROA signed, FICA and mandates outstanding */
  const lindiwe = mk("Lindiwe Xaba", ADV.erin, "lindiwe.xaba@example.co.za", "072 555 0190");
  onboard(lindiwe, { id: "9002140388085", age: 34, net: 64_000, job: "Marketing executive" });
  as("advisor");
  chooseRoute(s, tick(), lindiwe.id, "full");
  runAstutePull(s, tick(), lindiwe.id, false);
  saveFna(
    s,
    tick(),
    lindiwe.id,
    inputs({
      grossAnnualIncome: 860_000,
      monthlyExpenses: 41_000,
      dependants: 1,
      youngestDependantAge: 4,
      vehicleValue: 390_000,
      existingVehicleCover: 250_000,
    }),
  );
  requestQuotes(s, tick(), lindiwe.id);
  toggleQuote(s, tick(), lindiwe.id, `${lindiwe.id}:discovery:life`);
  toggleQuote(s, tick(), lindiwe.id, `${lindiwe.id}:auto-general:vehicle`);
  setCommentary(
    s,
    tick(),
    lindiwe.id,
    "Discovery selected for Vitality rewards, which the client will use. Vehicle cover raised to full retail value at Auto & General's lower premium.",
  );
  commitCommentary(s, tick(), lindiwe.id);
  recordMeeting(
    s,
    tick(20),
    lindiwe.id,
    "ROA presentation",
    "Walked through the comparison matrix. Client chose Discovery for life cover.",
  );
  as("client");
  signDocument(s, tick(), lindiwe.id, "roa", lindiwe.clientName);
  uploadFica(s, tick(), lindiwe.id, "idDocument", "id-front-back.pdf");
  uploadFica(s, tick(), lindiwe.id, "proofOfResidence", "municipal-account-aug.pdf");

  /* 6 · Stage 6: submitted, insurers deciding */
  const pieter = mk("Pieter van Wyk", ADV.lwazi, "pieter.vanwyk@example.co.za", "082 555 0166");
  onboard(pieter, { id: "7409185027086", age: 52, smoker: true, net: 95_000, job: "Farm owner" });
  as("advisor");
  chooseRoute(s, tick(), pieter.id, "full");
  runAstutePull(s, tick(), pieter.id, false);
  saveFna(
    s,
    tick(),
    pieter.id,
    inputs({
      grossAnnualIncome: 1_200_000,
      monthlyExpenses: 62_000,
      dependants: 0,
      youngestDependantAge: 0,
      bond: 900_000,
      existingLifeCover: 2_000_000,
      vehicleValue: 650_000,
      existingVehicleCover: 400_000,
    }),
  );
  requestQuotes(s, tick(), pieter.id);
  toggleQuote(s, tick(), pieter.id, `${pieter.id}:momentum:life`);
  toggleQuote(s, tick(), pieter.id, `${pieter.id}:santam:vehicle`);
  setCommentary(
    s,
    tick(),
    pieter.id,
    "Life cover with Momentum for estate liquidity on a farm holding. Santam agreed-value vehicle cover. Affordable against a R95k net income.",
  );
  commitCommentary(s, tick(), pieter.id);
  as("client");
  signDocument(s, tick(), pieter.id, "roa", pieter.clientName);
  uploadFica(s, tick(), pieter.id, "idDocument", "id.pdf");
  uploadFica(s, tick(), pieter.id, "proofOfResidence", "utility-bill.pdf");
  uploadFica(s, tick(), pieter.id, "bankStatement", "fnb-statement.pdf");
  validateBank(s, tick(), pieter.id);
  signDocument(s, tick(), pieter.id, "debit-order", pieter.clientName);
  signDocument(s, tick(), pieter.id, "life-declaration", pieter.clientName);
  as("advisor");
  submitApplication(s, tick(), pieter.id);
  as("client");
  completeMedical(s, tick(), pieter.id);
  s.session.role = "insurer";
  s.session.insurerId = "santam";
  insurerDecision(s, tick(45), pieter.id, `${pieter.id}:santam:vehicle`, "issue");
  s.session.insurerId = "momentum";

  /* 7 · Complete: single-need route, policy issued, annual review scheduled */
  const ayesha = mk("Ayesha Patel", ADV.priya, "ayesha.patel@example.co.za", "081 555 0121");
  onboard(ayesha, { id: "9506120199083", age: 30, net: 42_000, job: "Physiotherapist" });
  as("advisor");
  chooseRoute(s, tick(), ayesha.id, "single-need", { needId: "vehicle", amount: 320_000 });
  as("client");
  signDocument(s, tick(), ayesha.id, "single-need", ayesha.clientName);
  as("advisor");
  requestQuotes(s, tick(), ayesha.id);
  toggleQuote(s, tick(), ayesha.id, `${ayesha.id}:auto-general:vehicle`);
  setCommentary(
    s,
    tick(),
    ayesha.id,
    "Single-need request: vehicle cover only. Client declined a full analysis and signed the disclaimer. Lowest premium selected.",
  );
  commitCommentary(s, tick(), ayesha.id);
  as("client");
  signDocument(s, tick(), ayesha.id, "roa", ayesha.clientName);
  uploadFica(s, tick(), ayesha.id, "idDocument", "id.pdf");
  uploadFica(s, tick(), ayesha.id, "proofOfResidence", "lease.pdf");
  uploadFica(s, tick(), ayesha.id, "bankStatement", "capitec-statement.pdf");
  validateBank(s, tick(), ayesha.id);
  signDocument(s, tick(), ayesha.id, "debit-order", ayesha.clientName);
  as("advisor");
  submitApplication(s, tick(), ayesha.id);
  s.session.role = "insurer";
  s.session.insurerId = "auto-general";
  insurerDecision(s, tick(90), ayesha.id, `${ayesha.id}:auto-general:vehicle`, "issue");
  s.session.insurerId = "momentum";

  /* 8 · Escalated: sanctions/PEP potential match */
  const marcus = mk("Marcus Jacobs", ADV.lwazi, "marcus.jacobs@example.co.za", "083 555 0188");
  updateProfile(s, marcus.id, {
    idNumber: "6811045081082",
    age: 57,
    monthlyNetIncome: 130_000,
    employment: "Municipal councillor",
  });
  as("client");
  marcus.clientName = "Marcus Jacobs PEP"; // triggers the demo screening hit
  verifyIdentity(s, tick(), marcus.id);
  marcus.clientName = "Marcus Jacobs";

  /* A delivery that failed and is waiting for retry */
  s.queue.unshift({
    id: "q-seed-retry",
    ts: tick(5),
    target: "insurer",
    caseId: thabo.id,
    clientName: thabo.clientName,
    action: "Quote refresh from Discovery",
    status: "failed",
    attempts: 2,
    lastError: "Discovery quote API timed out (HTTP 504). Automatic retry scheduled",
  });

  s.session.role = "advisor";
  s.session.clientCaseId = lindiwe.id;
  return s;
}
