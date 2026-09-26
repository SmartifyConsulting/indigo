import {
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
  // Client-side steps (disclosure, presentation) pulse as the responding party.
  const party = n === 5 ? "resp" : "init";
  return (
    <section
      aria-label={`Step ${n}`}
      className={cn(
        "relative rounded-2xl border border-border bg-card p-3 pt-6",
        className,
      )}
    >
      <span className="label-caps absolute -top-3 left-3 rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] text-foreground">
        Step {n} · {STAGES[n - 1]?.short}
      </span>
      <div className={cn("flex gap-1.5", dir === "row" ? "flex-col sm:flex-row sm:flex-wrap sm:items-center" : "flex-col items-stretch")}>
        {data.out[n].map(({ sub, st }, i, arr) => (
          <Fragment key={sub.id}>
            <Pill sub={sub} st={st} party={party} />
            {i < arr.length - 1 && (
              <span className={cn("flex self-center", dir === "row" && "sm:-rotate-90")}><ThinArrow dir="down" /></span>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

/** Map arrow: a hairline grey stem with a small solid triangular head. */
export function ThinArrow({
  dir,
  length = 28,
  className,
}: {
  dir: "right" | "down" | "left" | "up";
  /** Total length in px, tip to tail. Longer values close the gap between two frames without moving the tail. */
  length?: number;
  className?: string;
}) {
  const rot = { right: -90, down: 0, left: 90, up: 180 }[dir];
  const lineEnd = length - 7;
  const headBase = length - 8;
  const tip = length - 1;
  return (
    <svg
      aria-hidden
      width="8"
      height={length}
      viewBox={`0 0 8 ${length}`}
      className={cn("shrink-0 text-muted-foreground", className)}
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <path d={`M4 0 V${lineEnd}`} stroke="currentColor" strokeWidth="1" />
      <path d={`M1.5 ${headBase} L4 ${tip} L6.5 ${headBase} Z`} fill="currentColor" />
    </svg>
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
  const props = { c, data, stage: s };
  return (
    <div className="flex w-full flex-col gap-5 lg:grid lg:w-3/4 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_auto] lg:gap-x-6 lg:gap-y-6">
      <Frame n={1} dir="row" {...props} className="lg:col-span-3 lg:row-start-1" />
      <ThinArrow dir="down" length={32} className="mx-auto hidden lg:col-start-3 lg:row-start-2 lg:-mt-6 lg:block" />
      <Frame n={2} dir="col" {...props} className="lg:col-start-3 lg:row-start-2 lg:mt-2" />
      <Frame n={3} dir="col" {...props} className="lg:col-start-3 lg:row-start-3 lg:self-start" />
      <Frame n={4} dir="row" {...props} className="lg:col-start-2 lg:row-start-4" />
      <ThinArrow dir="left" length={40} className="hidden self-center justify-self-end lg:col-start-1 lg:row-start-4 lg:-mr-3 lg:block" />
      <Frame n={5} dir="col" {...props} className="lg:col-start-1 lg:row-start-4 lg:mr-3" />
      <Frame n={6} dir="col" {...props} className="lg:col-start-1 lg:row-start-3" />
      <ThinArrow dir="up" className="mx-auto hidden lg:col-start-1 lg:row-start-3 lg:-mb-6 lg:self-end lg:block" />
      <div className="hidden items-center justify-center rounded-2xl border border-border p-4 text-center lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:flex">
        <p className="label-caps text-muted-foreground">
          {c.clientName}
          <br />
          <span className="font-mono text-foreground">{c.code}</span>
        </p>
      </div>
    </div>
  );
}
