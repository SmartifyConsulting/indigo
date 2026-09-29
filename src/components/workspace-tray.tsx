import { Link } from "@tanstack/react-router";
import { Check, Lock, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { ACTOR_STYLE, STAGE_DEFS } from "@/components/lifecycle-diagram";
import { Button } from "@/components/ui/button";
import { getStage, isComplete, type StageNo } from "@/lib/domain/gates";
import { stageRowsDone } from "@/lib/domain/lifecycle";
import { nextAction } from "@/lib/domain/next-action";
import { useAppState } from "@/lib/domain/store";
import type { CaseRecord } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/**
 * The Live Workspace tray for one case: six step bars in fixed order. Finished steps fold up
 * with a tick, the current step is the only one open and reveals its sub-steps one at a time,
 * later steps stay locked.
 */
export function WorkspaceTray({ c }: { c: CaseRecord | undefined }) {
  const s = useAppState();
  const role = s.session.role;
  const stage = c ? getStage(c) : 1;
  const complete = c ? isComplete(c) : false;
  const [open, setOpen] = useState<Set<StageNo>>(new Set([stage]));
  // Advance: when the case moves on, fold everything and open the new current step.
  useEffect(() => setOpen(new Set([stage])), [stage, c?.id]);

  if (!c) {
    return (
      <section className="rounded-lg border bg-card p-5">
        <p className="label-caps text-muted-foreground">Live workspace</p>
        <p className="mt-3 text-sm text-muted-foreground">Open a case to follow it step by step.</p>
      </section>
    );
  }

  const advisor = s.advisors.find((a) => a.id === c.advisorId);
  const na = nextAction(c);
  const myTurn = na.owner === role;
  const waitingOn =
    na.owner === "client"
      ? c.clientName
      : na.owner === "advisor"
        ? (advisor?.name ?? "the wealth manager")
        : na.owner === "insurer"
          ? "the insurer"
          : na.owner === "fsp"
            ? "the Key Individual"
            : "";
  const done = stageRowsDone(c, stage);

  return (
    <section aria-label="Live workspace" className="rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <p className="label-caps">Live workspace</p>
        <span className="rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[10px] font-medium text-brand-ink">
          LW-{c.code}
        </span>
      </header>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">{c.clientName}</p>
        <p className="text-[11px] text-muted-foreground">Wealth manager: {advisor?.name ?? "—"}</p>
      </div>
      <ol className="space-y-2 p-3">
        {STAGE_DEFS.map((def) => {
          const n = def.no;
          const state = complete || n < stage ? "done" : n === stage ? "current" : "locked";
          const isOpen = open.has(n) && state !== "locked";
          return (
            <li key={n} className="rounded-lg border border-border">
              <button
                type="button"
                disabled={state === "locked"}
                onClick={() =>
                  setOpen((p) => {
                    const x = new Set(p);
                    if (x.has(n)) x.delete(n);
                    else x.add(n);
                    return x;
                  })
                }
                aria-expanded={isOpen}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left",
                  state === "done" && "bg-positive-soft",
                  state === "current" && "bg-navy text-navy-foreground",
                  state === "locked" && "cursor-not-allowed opacity-60",
                )}
              >
                <span className="label-caps flex-1 truncate">
                  Step {n} · {def.title}
                </span>
                {state === "done" && <Check className="h-4 w-4 text-positive" />}
                {state === "locked" ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
                    {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </span>
                )}
              </button>
              {isOpen && (
                <ul className="space-y-1.5 px-3 pb-3 pt-2">
                  {def.rows.map((r, i) => {
                    const rowDone = state === "done" || i < done;
                    const current = state === "current" && i === done;
                    if (state === "current" && i > done) return null;
                    return (
                      <li
                        key={r.text}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                          rowDone && "border-positive/60 bg-positive-soft text-muted-foreground",
                          current && "border-brand bg-brand-soft",
                          current && myTurn && "pulse-border",
                        )}
                      >
                        {rowDone ? (
                          <Check className="h-3 w-3 shrink-0 text-positive" />
                        ) : (
                          <span
                            className={cn(
                              "rounded px-1 font-mono text-[9px] font-medium",
                              ACTOR_STYLE[r.actor],
                            )}
                          >
                            {r.actor === "ADVISOR" ? "WM" : r.actor}
                          </span>
                        )}
                        <span className="flex-1">{r.text}</span>
                      </li>
                    );
                  })}
                  {state === "current" && def.rows.length - done - 1 > 0 && (
                    <li className="px-3 text-[11px] text-muted-foreground">
                      then {def.rows.length - done - 1} more
                    </li>
                  )}
                  {state === "current" && (
                    <li className="mt-2 rounded-md border bg-background p-3">
                      <p className="text-[11px] text-muted-foreground">Next</p>
                      <p className="text-sm font-medium">{na.text}</p>
                      {myTurn ? (
                        <Button asChild size="sm" className="mt-2">
                          {role === "client" ? (
                            stage === 1 ? (
                              <Link to="/onboard/$code" params={{ code: c.code }}>
                                Do this now
                              </Link>
                            ) : (
                              <Link to="/actions">Do this now</Link>
                            )
                          ) : (
                            <Link to="/clients/$clientId" params={{ clientId: c.id }}>
                              Do this now
                            </Link>
                          )}
                        </Button>
                      ) : (
                        waitingOn && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Waiting on {waitingOn}
                          </p>
                        )
                      )}
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
