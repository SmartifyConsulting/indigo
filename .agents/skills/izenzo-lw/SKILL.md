---
name: izenzo-lw
description: "Rebuild a governed five-gate Live Workspace (LW) in the Izenzo visual style for any domain (trades, financial advisory, legal, insurance, supply chain and more). Always ask which application and domain it is for before building."
---

# Izenzo Live Workspace: a reusable template

Rebuild screens so they look and behave exactly like the Izenzo Live Workspace. Map the words to the target application's domain. The **layout and visual style never change**. Only the lexicon, the gate names and the data change.

---

## 0. STEP ZERO: ask before building (required)

Before writing any code, ask the user these questions (up to 4 per round):

1. **Application & domain**: What is this application for? Examples: Trade & commodities (Izenzo), Financial & investment advisory (indigro), Legal / case management, Insurance claims, Procurement / supply chain, Other.
2. **Core record**: What does one tab or workflow represent? Examples: Deal/Bid, Client case, Matter, Claim, Purchase order.
3. **The two parties**: Who is the initiator and who is the counterparty? Examples: Buyer ↔ Seller, Adviser ↔ Client, Attorney ↔ Client, Insurer ↔ Claimant.
4. **Gate mapping**: Should the five gates use the default domain mapping below, or custom names? Should an existing lifecycle be kept and grouped under the five gates?

Also confirm:
- **Existing screens and features must NOT be removed.** Wrap them and restyle them. Never delete.
- Should colours stay as the app's current tokens (the default), or switch to the Izenzo palette?

Record the answers in project memory. Then build.

---

## 1. Domain lexicon matrix

| Generic (Izenzo) | Trade (Izenzo) | Financial advisory (indigro) | Legal | Insurance claims |
|---|---|---|---|---|
| Record | Deal / Bid | Client case | Matter | Claim |
| Reference prefix | `BID…` | `CASE…` | `MAT…` | `CLM…` |
| Initiator | Bidder | Adviser / FSP | Attorney | Insurer |
| Counterparty | Counterparty | Client (read-only view) | Client | Claimant |
| Gate 1 · Trading | Find, Match & Verify | Onboarding & FNA (scan, KYC, needs analysis) | Intake & conflict check | Notification & FNOL |
| Gate 2 · GRC | Seal Intent, Offer, WaD, Legal | Compliance & Quotes (FICA, risk profile, quotes) | Engagement & mandate | Validation & fraud check |
| Gate 3 · Execution | Concept → Deliver | Record of Advice & Proposal sign-off | Pleadings & discovery | Assessment & settlement offer |
| Gate 4 · Finality | Payment · Signoff · Handover | Application submitted & policy issued | Judgment / settlement | Payment & closure |
| Gate 5 · Memory | Remember | Ledger, audit trail & annual review | Archive | Audit & recovery |
| Documents box | Business Docs / Legal Agreements | FICA docs, ROA, policy schedules | Court filings | Claim evidence |

Use a `RelabelScope` / lexicon helper so every label comes from one map. Never hardcode trade words in a non-trade application.

**The five-gate order never changes.** A domain with more stages groups them under the five gates. It never adds a sixth gate.

---

## 2. Themes (cream is the default)
Presets are stored in localStorage `izenzo:style-preset`, and each change fires the `izenzo:style-preset-change` event:
- `cream` (default light): `<html data-app="alpha-bravo">`
- `black` (Ink & Aqua dark): `data-app="izenzo"`
- `grid`: black + `body.ink-grid`
Run the init script in `<head>` before first paint. ThemeToggle: a 36px round button next to the avatar. It shows a Moon in light mode and a Sun in dark mode.

Light: background `oklch(0.98 0.006 90)`, foreground `oklch(0.19 0.01 260)`, card white, throb-accent `oklch(0.63 0.15 155)`.
Dark: background `oklch(0.16 0.008 260)`, card `oklch(0.255 0.02 253)`, primary `oklch(0.78 0.12 178)`, warning `oklch(0.78 0.14 78)`, border `oklch(1 0 0 / 42%)`.
Use semantic tokens only. The only exceptions: gate-yellow (`--warning`), step-green (`--success`/throb-accent) and royal blue `#4169e1` for counterparty accents.

## 3. Typography
Sora for headings, Manrope for body, Montserrat 700 for the greeting, IBM Plex Mono for references and hashes. Load all of them with `<link>` tags, never a remote `@import`.
`label-caps` = 11px, uppercase, `tracking-[0.15em]`, semibold. Row text is `text-xs`, meta text `text-[11px]`, pills `text-[10px]`.

---

## 4. LIVE WORKSPACE VISUAL BLUEPRINT (build exactly this)

Earlier builds failed because they reused generic list and card components. **Do not do that.** Build these specific parts:

### 4.1 Shell
- Wide shell: `max-w-[1680px]`, `pt-3`, no big page title and no footer (the taskbar replaces the footer).
- Top bar, all on one line: `label-caps` "{APP} {DOMAIN} WORKFLOW" (for example "IZENZO TRADE WORKFLOW" or "INDIGRO ADVICE WORKFLOW"), then the **MAP | STEPS** segmented pill toggle (`aria-pressed`, active = solid primary) and the window controls (minimise, maximise, pop out, close) on the right.

### 4.2 Split-screen layout (required)
```text
+--------------------------------------+-------------------------+
|  FLOW CANVAS (Map)                   |  LIVE WORKSPACE tray    |
|  capsule nodes + connectors          |  5 yellow gate pills    |
|  dashed DOCUMENTS tile               |  (+) expanders, ref pill|
|  circular yellow STEP 5 · MEMORY     |  current step pulses    |
+--------------------------------------+-------------------------+
| [+ NEW] [zoom] [tab][tab][ACTIVE][tab] ......... [refresh][close]|
+------------------------------------------------------------------+
```
- `grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-4`. On mobile the columns stack.
- MAP / STEPS **changes the left canvas's rendering** (tile map or vertical step list). It must **never hide the right tray**. It is not a page switcher.

### 4.3 Flow canvas nodes
- **Section headers**: `label-caps` "STEP n · {GATE}" above each gate cluster.
- **Capsule step nodes**: `rounded-full border-2 border-success px-4 py-2 text-xs font-medium bg-card`, each with a lucide icon on the left. Example trade steps: Register Bid, Confirm Intent. Example advisory steps: Scan Client, Complete FNA.
- **States**: done = solid success fill with a ✓. Current = `animate-throb-aqua` with a green highlight. Upcoming = muted border at `opacity-60`. Locked = lock icon.
- **Connectors**: SVG paths with arrowheads (`stroke-border`, `stroke-success` once done) that link the nodes top to bottom and across the gates.
- **Documents tile**: a `rounded-xl border-2 border-dashed` box labelled "DOCUMENTS" with a count badge (a small round primary pill). Clicking it opens the Document Register (uploader and timestamp).
- **Finality cluster**: three cards side by side (Payment · Signoff · Handover, or the domain equivalents), with Entry and Exit links.
- **STEP 5 · MEMORY**: a large **circular** node (`h-28 w-28 rounded-full bg-warning border-2 border-foreground`) centred at the bottom, labelled "STEP 5 · MEMORY".
- Fixed coordinate system (960×1050) scaled to fit the width, or a CSS grid that keeps the same positions.

### 4.4 Right tray: LIVE WORKSPACE gate pills
- Header: `label-caps` "LIVE WORKSPACE" plus a live dot.
- Five stacked bars, each `rounded-full border-2 border-foreground bg-warning px-4 py-2`. Each bar shows a bold `label-caps` title "STEP n · GATE" on the left, then the reference pill (mono, for example `BID9938656` or `CASE-1024`) and a round `(+)` / `(−)` expander on the right.
- Gate colour: complete = yellow and collapsed. Active = grey and expanded. Locked = muted with a lock icon.
- **Progressive unfolding**: only the current gate is expanded, and inside it the steps show one at a time. Finished steps collapse to a ✓ row. Later steps are hidden or locked.

### 4.5 Bottom taskbar
- Fixed bottom bar, `h-12`, full width.
- Far left: a black **"+ NEW"** pill (`rounded-full bg-foreground text-background`), then a zoom 🔍 control.
- Tabs: one per open record, as rounded pills, drag to reorder, saved to the account (a `user_workspace_tabs` table) so they follow the user across devices.
  - Inactive: `bg-[#4169e1] text-white`. Active: `bg-white text-[#4169e1] border-[#4169e1]`. In dark taskbar mode: black background, green text.
- Far right: refresh ↻ and close-all ⊗ buttons.
- Closing a tab opens a confirm window: "Save and Close" / "Cancel {Record}".

---

## 5. Pulsing rules
- `animate-throb` (1.6s) and `animate-throb-aqua` (1.8s): a box-shadow ring growing from 0 to 14px, background going from 14% to 4% accent, border from 95% to 55% accent.
- Pulse ONLY the single next action the **current** user must take. Never pulse anything for the other party.

## 6. Counterparty view
When the viewer is the counterparty, show a read-only workspace and set `--throb-accent: #4169e1`.

## 7. Supporting screens (adapt names to the lexicon)
- **All {Records}** table: search `q`, stage filter, mono reference, creator pill (`creatorTone(id)`), stage pill, dates. Each row opens `/workspace?{record}=id`.
- **Inbox / Archive**: unread dot, large mono reference, message, time. Mark read, archive and restore. Saved to the account.
- **Home**: hero with a pill badge, a large H1, and a sign-in card on the right. Signed-in users see an Active {Records} panel (up to 10, creator-colour left border) and the "Five stages, one governed flow" cards.

## 8. Pills
Base: `rounded-full px-1.5 py-0.5 text-[10px] font-medium`. Tones: success = done/signed, warning = pending or gate complete, info = in review, destructive = rejected.

## 9. Invariants (never break)
- Ask for the domain first (Section 0). Never ship trade words in a non-trade app.
- Never remove existing screens or features. Wrap them and restyle them.
- Split-screen layout with the canvas plus the tray. MAP / STEPS never hides the tray.
- The five-gate order is immutable. Sealed records are immutable. Identity/KYC must be complete before Execution and Finality.
- AI is advisory only. Every decision is made by a person, attributed to them and append-only.
- Use semantic tokens only, apart from the listed exceptions. Load fonts with `<link>` tags.

## 10. Verification checklist
Take Playwright screenshots at 1280 px wide and confirm:
- [ ] The top bar shows "{APP} {DOMAIN} WORKFLOW" and the MAP | STEPS pills.
- [ ] Both panes are visible: capsule nodes with connectors on the left, yellow gate pills on the right.
- [ ] The dashed DOCUMENTS tile shows a count badge, and the circular yellow MEMORY node is visible.
- [ ] Only one element pulses: the current user's next step.
- [ ] The taskbar has the + NEW pill, zoom, tabs, refresh and close.
- [ ] Every label uses the domain lexicon.

## Upfront prompts (ask before building)
1. Which application/domain is this for? (maps the lexicon)
2. Colour scheme: step frame colour **in process**, step frame colour **complete**, pulse colour for the **initiating party**, pulse colour for the **responding party**.
3. Shape: **rounded** or **square** frames, buttons and pills.

## Map layout (mandatory)
- Every step is a bordered **frame**; its sub-steps are pills **inside** the frame, joined by arrows.
- Perimeter loop: Step 1 horizontal across the top; Step 2 vertical on the right; Step 3 vertical beneath Step 2; Step 4 centred at the bottom below Step 3; Step 5 bottom-left in line with Step 4; Step 6 above Step 5. Arrows link frame to frame.
- Each frame has a step pill top-left and a reference ID top-right.
- Every Live Workspace shows its **ID pill top-right** of the header (e.g. LW-CASE-1024).
- Opening the workspace auto-opens a record so the taskbar tabs and ID are always visible.

## Full-bleed viewport shell
Ask for: "full-bleed viewport app shell — no max-width container, no page banner, canvas and tray fill the screen width". The workspace route must bypass the site's centred max-width wrapper and big page header; use a slim label bar with the MAP|STEPS toggle and ID pill.

## Mobile-app first
Design at 390px first: frames stack 1→6 vertically, horizontal arrows rotate to point down, tray drops below the canvas, taskbar scrolls sideways, tap targets ≥ 40px. Expand to the perimeter grid only at large screens.

## Frame, toggle, ID and arrow style (mandatory)
- The **MAP | STEPS** toggle sits **inside the Workflow Map frame header** (top-right of the map card), never in the page top bar.
- The **LW ID pill** (e.g. `LW-CASE-1024`) sits **inside the Live Workspace tray header, replacing the Live indicator**.
- Map step frames carry only the step pill top-left. **No ID pills on frames and no step pill on the top-right of the map area.**
- Every map frame and every accordion gate heading uses a **fine grey line**: `border border-border` (1px). No 2px, black or dashed frame borders.
- **All arrows on the map** (inside and between frames) share one style: a 1px grey line (`muted-foreground`) ending in a small solid triangular head, about 28px long. Never use chunky icon arrows or coloured/thick connectors.
