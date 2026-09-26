import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Banknote,
  BookOpen,
  Check,
  ClipboardList,
  FileSignature,
  FileText,
  Fingerprint,
  Layers,
  Lock,
  PenLine,
  RefreshCw,
  ScanLine,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Fragment } from "react";

import { STAGES, adviceGates, getStage, isComplete, roaSigned, type StageNo } from "@/lib/domain/gates";
import type { CaseRecord } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type St = "done" | "current" | "upcoming" | "locked";
interface Sub { id: string; label: string; icon: LucideIcon; done: boolean }

function subSteps(c: CaseRecord): Record<StageNo, Sub[]> {
  const stage = getStage(c);
  const fin = isComplete(c);
  const met = (id: string) => adviceGates(c).find((g) => g.id === id)?.met ?? false;
  const past = (n: StageNo) => fin || stage > n;
  const docs = [c.fica.idDocument, c.fica.proofOfResidence, c.fica.bankStatement].every(Boolean);
  return {
    1: [
      { id: "scan", label: "Scan Client", icon: ScanLine, done: met("liveness") },
      { id: "screen", label: "Screen Sanctions", icon: ShieldCheck, done: met("sanctions") },
      { id: "disclose", label: "Sign Disclosure", icon: PenLine, done: met("disclosure") },
      { id: "mode", label: "Choose FNA Path", icon: ClipboardList, done: past(1) },
    ],
    2: [
      { id: "docs", label: "Collect Documents", icon: FileText, done: docs || past(2) },
      { id: "aggregate", label: "Aggregate Portfolio", icon: Layers, done: past(2) },
    ],
    3: [
      { id: "fna", label: "Complete FNA", icon: Fingerprint, done: past(3) },
    ],
    4: [
      { id: "quotes", label: "Generate Quotes", icon: FileText, done: past(4) || roaSigned(c) },
      { id: "roa", label: "Sign ROA", icon: FileSignature, done: roaSigned(c) },
    ],
    5: [
      { id: "present", label: "Present to Client", icon: Send, done: past(5) },
      { id: "debit", label: "Debit Order", icon: Banknote, done: past(5) },
      { id: "declare", label: "Declaration", icon: FileSignature, done: past(5) },
    ],
    6: [
      { id: "issue", label: "Issuance", icon: Send, done: fin },
      { id: "ledger", label: "Audit Memory", icon: BookOpen, done: fin },
      { id: "review", label: "Annual Review", icon: RefreshCw, done: false },
    ],
  };
}

function states(c: CaseRecord) {
  const all = subSteps(c);
  const stage = isComplete(c) ? 7 : getStage(c);
  let currentSet = false;
  const out = {} as Record<StageNo, { sub: Sub; st: St }[]>;
  for (const n of [1, 2, 3, 4, 5, 6] as StageNo[]) {
    out[n] = all[n].map((sub) => {
      let st: St = sub.done ? "done" : n > stage ? "locked" : "upcoming";
      if (!sub.done && !currentSet && n <= stage) {
        st = "current";
        currentSet = true;
      }
      return { sub, st };
    });
  }
  return { out, stage };
}

function Pill({ sub, st, party }: { sub: Sub; st: St; party: "init" | "resp" }) {
  const Icon = st === "done" ? Check : st === "locked" ? Lock : sub.icon;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[11px] font-medium",
        st === "done" && "border-success bg-success text-background",
        st === "current" && party === "init" && "animate-throb-aqua border-success bg-success/15",
        st === "current" && party === "resp" && "animate-throb border-warning bg-warning/20",
        st === "upcoming" && "border-success/60 bg-card opacity-70",
        st === "locked" && "border-border bg-card text-muted-foreground opacity-60",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{sub.label}</span>
    </div>
  );
}

function Frame({
  n,
  c,
  data,
  stage,
  dir,
  className,
}: {
  n: StageNo;
  c: CaseRecord;
  data: ReturnType<typeof states>;
  stage: number;
  dir: "row" | "col";
  className?: string;
}) {
  const done = stage > n;
  const active = stage === n;
  const Arrow = dir === "row" ? ArrowRight : ArrowDown;
  // Client-side steps (disclosure, presentation) pulse as the responding party.
  const party = n === 5 ? "resp" : "init";
  return (
    <section
      aria-label={`Step ${n}`}
      className={cn(
        "relative rounded-2xl border-2 p-3 pt-6",
        done && "border-foreground bg-warning/30",
        active && "border-success bg-success/5",
        !done && !active && "border-dashed border-border bg-card/50",
        className,
      )}
    >
      <span
        className={cn(
          "label-caps absolute -top-3 left-3 rounded-full border-2 px-2.5 py-0.5 text-[10px]",
          done ? "border-foreground bg-warning text-foreground" : active ? "border-success bg-success text-background" : "border-border bg-card text-muted-foreground",
        )}
      >
        Step {n} · {STAGES[n - 1]?.short}
      </span>
      <span className="absolute -top-3 right-3 rounded-full border bg-card px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
        {c.code}-S{n}
      </span>
      <div className={cn("flex gap-1.5", dir === "row" ? "flex-col sm:flex-row sm:flex-wrap sm:items-center" : "flex-col items-stretch")}>
        {data.out[n].map(({ sub, st }, i, arr) => (
          <Fragment key={sub.id}>
            <Pill sub={sub} st={st} party={party} />
            {i < arr.length - 1 && (
              <Arrow
                aria-hidden
                className={cn(
                  "h-3.5 w-3.5 shrink-0 self-center",
                  dir === "row" && "rotate-90 sm:rotate-0",
                  st === "done" ? "text-success" : "text-border",
                )}
              />
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

/**
 * Perimeter loop: Step 1 across the top, Steps 2–3 down the right,
 * Step 4 centred at the bottom, Step 5 bottom-left, Step 6 above Step 5.
 * Stacks 1→6 on mobile.
 */
export function FramedCanvas({ c }: { c: CaseRecord }) {
  const data = states(c);
  const s = data.stage;
  const link = (on: boolean) => (on ? "text-success" : "text-border");
  const props = { c, data, stage: s };
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_auto] lg:gap-x-6 lg:gap-y-6">
      <Frame n={1} dir="row" {...props} className="lg:col-span-3 lg:row-start-1" />
      <ArrowDown aria-hidden className={cn("mx-auto hidden h-5 w-5 lg:col-start-3 lg:row-start-2 lg:-mt-5 lg:block", link(s > 1))} />
      <Frame n={2} dir="col" {...props} className="lg:col-start-3 lg:row-start-2 lg:mt-2" />
      <Frame n={3} dir="col" {...props} className="lg:col-start-3 lg:row-start-3" />
      <Frame n={4} dir="row" {...props} className="lg:col-start-2 lg:row-start-4" />
      <ArrowLeft aria-hidden className={cn("hidden h-5 w-5 self-center justify-self-end lg:col-start-1 lg:row-start-4 lg:-mr-5 lg:block", link(s > 4))} />
      <Frame n={5} dir="col" {...props} className="lg:col-start-1 lg:row-start-4 lg:mr-3" />
      <Frame n={6} dir="col" {...props} className="lg:col-start-1 lg:row-start-3" />
      <ArrowUp aria-hidden className={cn("mx-auto hidden h-5 w-5 lg:col-start-1 lg:row-start-3 lg:-mb-5 lg:self-end lg:block", link(s > 5))} />
      <div className="hidden items-center justify-center rounded-2xl border-2 border-dashed border-border p-4 text-center lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:flex">
        <p className="label-caps text-muted-foreground">
          {c.clientName}
          <br />
          <span className="font-mono text-foreground">{c.code}</span>
        </p>
      </div>
    </div>
  );
}
