import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, CircleCheck, Lock } from "lucide-react";
import { useState } from "react";

import {
  STAGES,
  adviceGates,
  getStage,
  isComplete,
  quoteGates,
  submissionGates,
  type Gate,
  type StageNo,
} from "@/lib/domain/gates";
import { nextAction } from "@/lib/domain/next-action";
import type { CaseRecord } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

function gatesFor(c: CaseRecord, n: StageNo): Gate[] {
  if (n === 1) return adviceGates(c);
  if (n === 2 || n === 3) return quoteGates(c).filter((g) => !adviceGates(c).some((a) => a.id === g.id));
  if (n === 4 || n === 5) return submissionGates(c);
  return [];
}

/** Classic steps view: bracketed +/- step pills, group divider, wide rounded sub-step rows. */
export function StepsView({ c }: { c: CaseRecord }) {
  const current = getStage(c);
  const done = isComplete(c);
  const [peek, setPeek] = useState<StageNo | null>(null);
  const na = nextAction(c);

  return (
    <ol className="space-y-2">
      {STAGES.map((st) => {
        const complete = done || st.no < current;
        const active = !done && st.no === current;
        const locked = !complete && !active;
        const open = active || peek === st.no;
        const gates = gatesFor(c, st.no);
        const firstUnmet = gates.findIndex((g) => !g.met);
        return (
          <li key={st.no}>
            <div className="flex items-center gap-2">
              <span aria-hidden className="font-display text-2xl leading-none text-muted-foreground/60">
                {"{"}
              </span>
              <button
                type="button"
                disabled={locked}
                aria-expanded={open}
                onClick={() => !active && setPeek(peek === st.no ? null : st.no)}
                className={cn(
                  "label-caps rounded-lg border border-border px-3 py-1 text-[10px] font-bold",
                  complete && "bg-warning text-foreground",
                  !complete && "bg-foreground text-background",
                  locked && "cursor-not-allowed opacity-80",
                )}
              >
                {open ? "−" : "+"}Step {st.no} · <span className="ml-3">{st.short}</span>
              </button>
              <span className="flex-1" />
              {complete && <CircleCheck className="h-4 w-4 text-warning" aria-label="Complete" />}
              {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Locked" />}
            </div>
            {open && (
              <div className="ml-12 mt-3 space-y-2 pb-2">
                <div className="flex items-center gap-2">
                  <span className="label-caps text-[10px] text-muted-foreground">−{st.title}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                {gates.length === 0 && (
                  <p className="px-3 text-xs text-muted-foreground">
                    {complete ? "Stage complete." : na.text}
                  </p>
                )}
                {gates.map((g, i) => {
                  const isCurrent = active && i === firstUnmet;
                  const Icon = g.met ? CheckCircle2 : Circle;
                  return (
                    <div
                      key={g.id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-4 py-2 text-sm",
                        g.met && "border-success bg-success/10",
                        isCurrent && "animate-throb-aqua border-success",
                        !g.met && !isCurrent && "border-border bg-card text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{g.label}</span>
                      {isCurrent && (
                        <Link
                          to="/clients/$clientId"
                          params={{ clientId: c.id }}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {na.text} →
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
