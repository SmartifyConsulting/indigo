# Live Workspace: step-by-step tray, Ayesha Patel walkthrough, connected map arrows

## 1. Live Workspace tray (right side of the map)
Replace the "go to your Dashboard" placeholder with a real tray for the open case:
- Header: "LIVE WORKSPACE" with the case ID pill (e.g. LW-CASE-xxxx) in place of the Live dot.
- Six stacked step bars in the fixed order (Client Gateway, Portfolio, Needs Analysis, Quotes & ROA, Presentation, Issuance & Review), each with a `+` / `−` expander.
- Folding rules as the case moves forward:
  - Finished steps fold up into a single bar with a tick (complete colour). They can be reopened to read, but not changed.
  - The current step is the only one open. Inside it, sub-steps show one at a time: finished sub-steps shrink to a ticked row, the current sub-step pulses, later sub-steps are hidden behind a "then N more" line.
  - Later steps stay folded with a lock icon.
- Each current sub-step shows who acts (Client, Wealth Manager, System, Insurer) and, when it is the viewer's turn, the action button (for example "Sign disclosure", "Request quotes"). Only the viewer's own next action pulses; the other party's turn shows "Waiting on Erin Kruger" or "Waiting on Ayesha Patel".
- The same fold/reveal state drives the map: the current sub-step is highlighted in its frame, finished frames show ticks.
- Stays visible in both Map and Steps views.

## 2. Ayesha Patel use case with Erin Kruger
- Ayesha's case moves to Erin Kruger as her wealth manager and starts again at Step 1 (invited, nothing done), so the whole exchange can be walked through.
- Opening Live Workspace auto-opens Ayesha's case in a tab, so the tray and ID pill are visible straight away.
- The walkthrough alternates between the two sides using the existing role switch:
  - Erin: sends invite, chooses route, runs portfolio pull, captures needs, requests quotes, selects options and commentary, submits.
  - Ayesha: verifies identity, signs disclosure and LOA, signs ROA, uploads FICA, signs debit order.
  - System steps (screening, portfolio pull, affordability, ROA generation) complete on their own when their trigger is met.
- Every action goes through the existing compliance rules, so out-of-order attempts are still refused and logged.
- The other example clients are unchanged, apart from Ayesha. The "completed, policy issued" example moves to Pieter van Wyk's issued vehicle policy, which already exists, so the dashboards still show a finished case.

## 3. Map arrows that touch the frames
- Draw 1px grey connectors with small solid arrowheads linking 1 → 2 → 3 → 4 → 5 → 6 → back to 1, following the perimeter loop.
- Arrow positions are measured from the real frame edges, so each line starts on one frame's edge and its tip touches the next frame. They redraw when frames expand or collapse and when the window resizes.
- Connectors between finished steps turn to the complete colour. The connector leading into the current step uses the teal accent.
- On narrow screens, where frames stack, the arrows become short downward arrows between frames.

## Technical details
- New `src/components/workspace-tray.tsx`: gate bars and sub-step reveal, built on `stageRowsDone()` and `nextAction()` from the domain layer. Action buttons call the existing `actions.*` store functions and `SignButton`.
- A sub-step catalogue shared by the map and the tray (actor, label, action) moves from `lifecycle-diagram.tsx` into `src/lib/domain/steps.ts`.
- `LifecycleFlow` takes an optional `case` prop so it can show one case's progress (current row, ticks) as well as the all-clients chips.
- Connectors: an absolutely positioned SVG overlay inside the map grid. Frame refs, `getBoundingClientRect` and a `ResizeObserver` compute the edge-to-edge paths, with an arrowhead `<marker>`.
- In `seed.ts`, Ayesha is created under `ADV.erin` and her stage 2 to 6 calls are removed. Existing saved demo data only picks this up after "Reset demo".
- `live-workspace.tsx`: if no `?case=` is given, it defaults to Ayesha's case (or the first case) and opens the tab.
