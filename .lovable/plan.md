# Landing page, role-based sign-up, and the API integrations console

Four pieces of work: a public hero landing page as the front door, sign-up/sign-in that captures the role a person is joining as, a fuller Integrations screen (active/inactive services with usernames, passwords, keys, top-up links and unit pricing), and a new collapsed-by-default monthly cost report.

## 1. Landing page becomes the front door

- The home address shows a public hero modelled on the Simple Izenzo layout: an eyebrow badge, a large headline, a short lead paragraph, primary and secondary buttons, and a compact sign in / sign up card sitting to the right of the headline.
- Below the hero, a row of numbered stage cards describing how the advice lifecycle runs, plus a closing call-to-action strip.
- The signed-in workspace moves to its own address (`/dashboard`). Anyone already signed in who lands on the home page is sent straight there; the nav, role switcher and every internal link are updated to match.
- The landing page keeps its own page title, description and social preview text.

## 2. Sign-up and sign-in per the sign-up skill (auth scope)

- Sign-up completes immediately — no "check your email" wall. New accounts get a session and land in the workspace.
- One-time email verification on the **second** sign-in only, via an emailed link (never a code). Once verified, the prompt never appears again. People who signed in with Google skip it entirely.
- Live password checklist on sign-up (8+ characters, a letter and a number, not the same as the email name), with the first failing rule focused on submit.
- One shared message helper for all auth errors — wrong password, breached password, rate limits, expired links — shown as both a toast and an inline live-region message.
- Every password field keeps its eye / eye-off toggle; "Forgot password?" and the toggles stay out of the tab order so tabbing runs Email → Password → Submit.
- Forgot-password and reset-password pages stay public and keep working.
- Out of scope for now (per your answer): email 2FA, first-visit navigation tips, install-app banner.

## 3. Choosing a role when signing up or in

- Sign-up asks which role the person is joining as: Adviser, Compliance officer, Client, Insurer, or FSP administrator.
- The chosen role is saved against the account and decides what they see. Sensitive roles (administrator, compliance) are requested rather than granted — they land in a pending state until an existing administrator approves them from the admin area; everyone else is granted straight away.
- Sign-in shows the role the account holds and, where an account legitimately holds more than one, lets the person pick which one to open.
- The first account on a workspace still becomes the administrator automatically.

## 4. Integrations tab: active and inactive services

Rebuild `/admin/integrations` around a service catalogue, modelled on Simple Izenzo:

- Two columns — **Active** and **Inactive** — each service as a card showing what it is used for and what it costs.
- Per service, fields for portal username, portal password/credentials, API key, secret, webhook secret, base URL and sandbox/production. Secrets are encrypted at rest and never returned to the browser unless an administrator presses **Reveal**; leaving a secret field blank keeps the saved value.
- A **Top up** button linking to the provider's own billing/credits page, and a link to their docs.
- **Price per unit of measure** per service (for example "R12.50 per identity check", "R0.85 per quote request") — editable by an administrator, with the unit name stored alongside the amount.
- Test connection, rotate and remove actions, as today, all written to the call log.
- Non-administrators see status only, with no credential fields.

## 5. API Integration Report tab

A new tab on the same screen:

- One accordion row per service, **all collapsed by default**, showing the service name, this month's measured call count and this month's running cost.
- Expanding a row shows a month-by-month breakdown for the last 12 months: calls recorded, price per unit at the time, and cost for that month, with successful vs failed calls separated.
- A total across all services per month sits at the top of the tab.
- Costs are measured from real usage: calls recorded in the app's own API call log, multiplied by the price per unit you set on each service. Where no unit price is set, the row shows "No price set" rather than a zero.

## Technical notes

- New route `src/routes/dashboard.tsx` for the workspace, `src/routes/index.tsx` rewritten as the public marketing route; `__root.tsx` bare-prefix list and auth gate updated so the landing page renders outside the shell for signed-out visitors.
- Migration: `auto_confirm_email = true`; add `profiles.login_count`, `profiles.email_verified_at`; RPCs `bump_login_count`, `mark_email_verified`, `mark_email_verified_if_oauth`; extend `app_role` with `insurer` and `fsp`; add `role_requests` table for pending sensitive roles; add `api_integrations` columns `unit_price`, `unit_label`, `top_up_url`, `docs_url`, `portal_username`; extend `api_credentials` for multi-field secrets. Grants and RLS on every new object; roles stay in `user_roles` behind `has_role`.
- Cost aggregation runs as a server function over `api_call_log` grouped by integration and month, joined to the current unit price; admin-only.
- Secrets read/written only through the privileged server client; reveal is an explicit admin-only server call that is itself logged.
- New `src/lib/integrations.catalog.ts` describing each provider, its fields, cost note, top-up and docs links.
- Landing hero reuses existing design tokens (navy / teal, Poppins) rather than Izenzo's palette.
