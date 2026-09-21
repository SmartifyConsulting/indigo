# indigro

Compliance-driven advice platform for wealth managers, their clients, FSP Key Individuals and
insurers. It runs a client through six regulated stages (onboarding, portfolio aggregation,
needs analysis, multi-insurer quotes and ROA, presentation and submission, issuance and annual
review) and refuses any step taken out of legal order.

The interface follows the look and feel of a modern broker portal: cool grey canvas, deep
slate-navy header, flat white cards, tight 3px controls, a single blue action colour and a teal
brand accent, set in Inter.

This is a **clickable prototype** with in-browser state. Astute, DIDIT, insurer quoting and CRM
integrations are simulated behind swappable interfaces. See
[docs/FUNCTIONAL_SPEC.md](docs/FUNCTIONAL_SPEC.md) for the requirement-by-requirement status.

## Try it

```sh
npm install
npm run dev
```

Open `/login`, choose a role, and use **View as** in the header to switch between the Wealth
Manager, Client, FSP / Key Individual and Insurer views. **Reset demo data** is in the account
menu.

Things worth trying:

- As the advisor, open **Sasha Weinberg**, run the needs analysis, request quotes, select options.
- Change a selection after the client has signed: the ROA is re-versioned and the old signature lapses.
- As the FSP, open **Compliance & audit → Audit ledger**: verify integrity, then simulate tampering.
- Open **Naledi Mokoena** and use the client's onboarding link to walk the gateway as the client.
- A client name containing "PEP" triggers the sanctions escalation path.

## Checks

```sh
npm run check:domain   # SHA-256, FNA maths, gate enforcement, ledger tamper detection
npm run build
```

## Code map

| Path | What it holds |
|---|---|
| `src/lib/brand.ts` | product name and tagline (rename here) |
| `src/lib/domain/gates.ts` | compliance gates and derived stages |
| `src/lib/domain/engine.ts` | every state transition, gate-checked and ledger-logged |
| `src/lib/domain/fna.ts` | needs-analysis and estate-duty engine |
| `src/lib/domain/quotes.ts` | quote provider interface and simulated insurer pricing |
| `src/lib/domain/ledger.ts` | hash-chained audit ledger and verification |
| `src/lib/domain/seed.ts` | demo data, built through the same engine functions |
| `src/components/case/` | the six stage tabs of the client workspace |

Built with [Lovable](https://lovable.dev); commits pushed to `main` sync back to the Lovable editor.
