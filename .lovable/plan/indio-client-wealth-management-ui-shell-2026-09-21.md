# Indio — Client & Wealth Management UI Shell

A four-section interface shell using the brand's navy and teal, with the bold lowercase
geometric wordmark styling taken from the logo.

## Look and feel

- Base: light interface — white working area, soft grey-blue page background.
- Navy (#2E3E50) for the side navigation, headings, and body text.
- Teal (#2EC4C0) for the active navigation item, key figures, buttons, and chart highlights.
- Typography: Poppins — heavy lowercase for the wordmark and page titles, regular for
  everything else. Rounded corners, thin hairline dividers echoing the logo underline.

## Screens

**Dashboard** — total assets under management, client count, net flows, and month change as
summary tiles; an allocation breakdown; a performance chart area; a recent activity list.

**Clients** — searchable, filterable client table: name, segment, portfolio value, adviser,
last review, status. Clicking a row opens the client detail.

**Client detail** — profile header with contact details and risk profile, holdings snapshot,
linked accounts, notes and activity timeline.

**Portfolios** — account list with holdings breakdown, positions table (instrument, units,
price, value, weight, gain/loss) and performance summary.

**Reports & documents** — document library with type, client, date, and download actions,
plus a small set of report-generation shortcuts.

All screens use placeholder sample figures. No real data or accounts are stored yet.

## Shared shell

Fixed left navigation with the wordmark, the five destinations, and a user block at the
bottom. Top bar with page title, global search, notifications, and profile. Collapses to a
slide-over menu on smaller screens.

## Technical notes

- Routes: `/` (dashboard), `/clients`, `/clients/$id`, `/portfolios`, `/reports`, each with
  its own page metadata.
- Design tokens (navy, teal, surfaces, radii) defined in `src/styles.css` as oklch values and
  mapped through `@theme inline`; no hardcoded colour utilities in components.
- Poppins loaded via a `<link>` in `src/routes/__root.tsx`; the app shell (sidebar + top bar)
  lives in a shared layout component rendered around the router outlet.
- shadcn primitives (table, card, tabs, input, badge, dropdown, sheet) restyled to the brand.
- Sample data in a typed local module so a real backend can replace it later without touching
  the UI.

## Not in this step

No database, authentication, or live market data — the shell is visual, ready for a backend
to be wired in next.
