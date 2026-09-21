# indigro: functional specification and build status

Source: "Functional Specification Document: Compliance-Driven Financial Advisory Platform"
(generated from the session minutes), merged with the wealth-manager and client ecosystem
vision. This file records how each requirement is delivered in the prototype and what is still
simulated. **The prototype is a front-end with in-browser state.** No backend, credentials or
live integrations are connected yet.

## Lifecycle mapping

The specification lists nine stages; the product blueprint groups them into six. The mapping
used in the app:

| App stage | Specification stages |
|---|---|
| 1. Client gateway and onboarding | 1: onboarding, disclosure, authority mandate |
| 2. Portfolio aggregation and CRM sync | 2: data aggregation and portfolio retrieval |
| 3. Wealth and risk needs analysis | 3: FNA and calculation |
| 4. Multi-quote generation and ROA | 4: insurer quoting and ROA compilation |
| 5. Client presentation and submission | 5: presentation and customisation; 6: FICA and banking validation; 7: application submission, e-signatures, underwriting |
| 6. Issuance, audit and annual review | 8: tracking and policy issuance; 9: continuous compliance and annual review |

Stages are **derived from case data** (`src/lib/domain/gates.ts`), never stored, so a case
cannot show a stage it has not earned.

## Requirement traceability

| Spec | Requirement | Status | Where |
|---|---|---|---|
| 2.1 | QR / secure-link gateway | Built | `/onboard/$code`, QR on the case workspace and invite dialog |
| 2.1 | Liveness, Home Affairs / DIDIT | Simulated | `verifyIdentity` in `engine.ts` (provider seam) |
| 2.1 | Sanctions / AML / PEP screening | Simulated | names containing "PEP" return a match, halting onboarding and escalating to the KI |
| 2.1 | Pre-quote disclosure, LOA signatures | Built | `SignDialog`, gates in `gates.ts`, SHA-256 fingerprint per signature |
| 2.1 | Single-need disclaimer | Built | onboarding route choice, `single-need` signature |
| 2.2 | Astute portfolio pull | Simulated | `runAstutePull` returns deterministic sample products |
| 2.2 | Cross-alert when another brokerage queries | Built | logs an alert, locks portfolio data until an updated mandate is signed |
| 2.2 | Insurer short-term schedules and claims history | Simulated | claims-in-36-months column in the portfolio table |
| 2.2 | Two-way CRM sync (Salesforce, HubSpot) | Simulated | toggles, per-case sync log; **push only** in the prototype |
| 2.3 | FNA engine (liabilities, assets, income protection, estate duty, risk profile) | Built | `fna.ts`; deterministic, stated assumptions, verified by `npm run check:domain` |
| 2.3 | Life, short-term (incl. pet cover), investment categories | Built | needs table by category |
| 2.4 | Multi-quote engine, top-3 comparison | Simulated pricing | `quotes.ts` behind a `QuoteProvider` interface |
| 2.4 | Auto-ROA, commentary, affordability, version tracking | Built | any option change creates a new version and voids signatures bound to the old one |
| 2.4 | Debit order and life declaration e-signatures | Built | tied to the current ROA version |
| 2.4 | Medical underwriting routing | Built | encrypted self-service link (answers are never stored) or insurer tele-underwriting |
| 2.5 | Hard enforcement of legal order | Built | every advancing action re-checks gates and logs refused attempts |
| 2.5 | Immutable audit ledger, time-stamped | Built (logic) | hash-chained ledger, integrity verification, tamper demo. **Not yet WORM storage** |
| 2.5 | Quarterly / on-demand audit exports | Built | CSV and JSON export from the compliance console |
| 3 (stage 6) | FICA documents and bank validation | Built (simulated checks) | required before submission |
| 3 (stage 9) | Annual review, renewal schedule, client acknowledgement | Built | review date set on issue; renewal issue and acknowledgement logged |
| 5.2 | Fail-safe queue with retry and exception logging | Built (simulated) | Integrations delivery queue with retry |
| 6 | FSP licensing model | Built | hybrid SaaS: platform fee to the FSP plus per-active-advisor seat (`/billing`, rates illustrative) |

## Not in this build

- Real authentication, multi-tenant data isolation and role-based access on a server.
- AES-256 at rest, TLS 1.3 in transit, POPIA controls, 99.9% availability: infrastructure work.
- Live Astute, DIDIT, insurer and CRM integrations (each needs credentials and contracts).
- WORM storage anchoring for the ledger.
- Two-way CRM sync (inbound changes).
- Specification Phase 2: AI speech-to-text meeting summaries and ROA drafting, advanced fraud
  detection, real-time book portability and remuneration audit, multi-tenant executive dashboards.

## Decisions log (specification section 6)

1. **Astute cross-alerting**: log an information alert and require an updated, re-signed
   authority mandate before unlocking portfolio data. Implemented.
2. **Medical underwriting**: encrypted client self-service link, with optional insurer
   tele-underwriting. Implemented.
3. **Licensing model**: hybrid SaaS, platform fee to the parent FSP plus a monthly seat fee per
   active advisor. Implemented as a billing model view with illustrative rates.
