import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Lock } from "lucide-react";
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

/** Steps view: one accordion per stage, fixed order, only the current stage unfolded. */
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
          <li key={st.no} className="overflow-hidden rounded-lg border">
            <button
              type="button"
              disabled={locked}
              aria-expanded={open}
              onClick={() => !active && setPeek(peek === st.no ? null : st.no)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium",
                complete && "bg-warning/25 text-foreground",
                active && "bg-muted",
                locked && "cursor-not-allowed text-muted-foreground",
              )}
            >
              <span className="font-mono text-xs">{String(st.no).padStart(2, "0")}</span>
              <span className="flex-1">{st.title}</span>
              {complete && <Check className="h-4 w-4" />}
              {locked && <Lock className="h-3.5 w-3.5" />}
              {!locked && (
                <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
              )}
            </button>
            {open && (
              <div className="space-y-1.5 border-t p-3">
                {gates.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {complete ? "Stage complete." : na.text}
                  </p>
                )}
                {gates.map((g, i) => {
                  if (g.met)
                    return (
                      <p key={g.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-positive" /> {g.label}
                      </p>
                    );
                  // Progressive unfolding: only the first open step is shown in full.
                  if (active && i !== firstUnmet) return null;
                  return (
                    <div
                      key={g.id}
                      className={cn(
                        "rounded-md border p-2.5 text-xs",
                        active && "animate-throb-aqua",
                      )}
                    >
                      <p className="font-medium">{g.label}</p>
                      {g.detail && <p className="mt-0.5 text-muted-foreground">{g.detail}</p>}
                    </div>
                  );
                })}
                {active && (
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: c.id }}
                    className="inline-block pt-1 text-xs font-medium text-primary hover:underline"
                  >
                    Next: {na.text} →
                  </Link>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
