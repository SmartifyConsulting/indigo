import { Link } from "@tanstack/react-router";
import {
  Banknote,
  Check,
  ClipboardList,
  FileSignature,
  FileText,
  Fingerprint,
  Layers,
  Lock,
  Minus,
  PenLine,
  Plus,
  ScanLine,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useState } from "react";

import { adviceGates, getStage, isComplete, roaSigned, type StageNo } from "@/lib/domain/gates";
import { nextAction } from "@/lib/domain/next-action";
import type { CaseRecord } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** Advisory lexicon for the five Izenzo gates. Order is immutable. */
export const GATES = [
  { no: 1, title: "Onboarding", stages: [1] },
  { no: 2, title: "Compliance", stages: [2, 3] },
  { no: 3, title: "Advice", stages: [4] },
  { no: 4, title: "Submission", stages: [5] },
  { no: 5, title: "Memory", stages: [6] },
] as const;

type NodeState = "done" | "current" | "upcoming" | "locked";
interface FlowNode {
  id: string;
  label: string;
  icon: LucideIcon;
  state: NodeState;
}

export function gateOf(c: CaseRecord): number {
  if (isComplete(c)) return 6;
  const s = getStage(c);
  return GATES.find((g) => (g.stages as readonly number[]).includes(s))?.no ?? 1;
}

function nodesFor(c: CaseRecord): Record<number, FlowNode[]> {
  const stage = getStage(c);
  const done = isComplete(c);
  const ag = adviceGates(c);
  const met = (id: string) => ag.find((g) => g.id === id)?.met ?? false;
  const byStage = (n: StageNo): boolean => done || stage > n;
  const raw: Record<number, { id: string; label: string; icon: LucideIcon; done: boolean }[]> = {
    1: [
      { id: "scan", label: "Scan Client", icon: ScanLine, done: met("liveness") },
      { id: "screen", label: "Screen Sanctions", icon: ShieldCheck, done: met("sanctions") },
      { id: "disclose", label: "Sign Disclosure", icon: PenLine, done: met("disclosure") },
      { id: "mode", label: "Choose FNA Path", icon: ClipboardList, done: byStage(1) },
    ],
    2: [
      { id: "aggregate", label: "Aggregate Portfolio", icon: Layers, done: byStage(2) },
      { id: "fna", label: "Complete FNA", icon: Fingerprint, done: byStage(3) },
    ],
    3: [
      { id: "quotes", label: "Generate Quotes", icon: FileText, done: byStage(4) || roaSigned(c) },
      { id: "roa", label: "Sign ROA", icon: FileSignature, done: roaSigned(c) },
    ],
    4: [
      { id: "present", label: "Present to Client", icon: Send, done: byStage(5) },
    ],
  };
  const out: Record<number, FlowNode[]> = {};
  let currentSet = false;
  for (const g of [1, 2, 3, 4]) {
    out[g] = (raw[g] ?? []).map((n) => {
      let state: NodeState = n.done ? "done" : "upcoming";
      if (!n.done && !currentSet) {
        state = "current";
        currentSet = true;
      } else if (!n.done && g > gateOf(c)) state = "locked";
      return { id: n.id, label: n.label, icon: n.icon, state };
    });
  }
  return out;
}

function Capsule({ n }: { n: FlowNode }) {
  const Icon = n.state === "done" ? Check : n.state === "locked" ? Lock : n.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-medium",
        n.state === "done" && "border-success bg-success text-success-foreground",
        n.state === "current" && "animate-throb-aqua border-success bg-success/15 text-foreground",
        n.state === "upcoming" && "border-success bg-card text-foreground opacity-60",
        n.state === "locked" && "border-border bg-card text-muted-foreground opacity-60",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {n.label}
    </div>
  );
}

function Connector({ done }: { done: boolean }) {
  return (
    <div className="flex justify-center" aria-hidden>
      <svg width="12" height="22" viewBox="0 0 12 22">
        <path d="M6 0 V16" className={done ? "stroke-success" : "stroke-border"} strokeWidth="2" />
        <path d="M1 14 L6 21 L11 14" className={done ? "fill-success" : "fill-border"} />
      </svg>
    </div>
  );
}

/** Left canvas: capsule nodes per gate, dashed DOCUMENTS tile, finality cluster, MEMORY circle. */
export function FlowCanvas({ c }: { c: CaseRecord }) {
  const nodes = nodesFor(c);
  const g = gateOf(c);
  const docs =
    [c.fica.idDocument, c.fica.proofOfResidence, c.fica.bankStatement].filter(Boolean).length +
    c.roa.length;
  const cluster = [
    { label: "Debit Order", icon: Banknote },
    { label: "Declaration", icon: FileSignature },
    { label: "Issuance", icon: Send },
  ];

  return (
    <div className="space-y-2">
      {GATES.slice(0, 4).map((gate) => (
        <Fragment key={gate.no}>
          <section aria-label={`Step ${gate.no}`} className="space-y-2">
            <p className={cn("label-caps", g === gate.no ? "text-foreground" : "text-muted-foreground")}>
              Step {gate.no} · {gate.title}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(nodes[gate.no] ?? []).map((n, i, arr) => (
                <Fragment key={n.id}>
                  <Capsule n={n} />
                  {i < arr.length - 1 && (
                    <span aria-hidden className={cn("h-0.5 w-4", n.state === "done" ? "bg-success" : "bg-border")} />
                  )}
                </Fragment>
              ))}
            </div>
            {gate.no === 2 && (
              <div className="relative mt-2 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="label-caps text-foreground">Documents</span>
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {docs}
                </span>
              </div>
            )}
            {gate.no === 4 && (
              <div className="grid gap-2 sm:grid-cols-3">
                {cluster.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className={cn(
                      "rounded-lg border bg-card p-3 text-xs",
                      g > 4 ? "border-success" : "opacity-60",
                    )}
                  >
                    <Icon className="mb-1 h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {g > 4 ? "Exit ✓" : "Entry"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
          <Connector done={g > gate.no} />
        </Fragment>
      ))}
      <div className="flex justify-center pt-1">
        <div
          className={cn(
            "flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-foreground bg-warning text-center text-foreground",
            g === 5 && "animate-throb-aqua",
          )}
        >
          <span className="label-caps">Step 5</span>
          <span className="label-caps">Memory</span>
        </div>
      </div>
    </div>
  );
}

/** Right tray: five yellow gate pills; only the current gate is expanded. */
export function GateTray({ c }: { c: CaseRecord }) {
  const g = gateOf(c);
  const nodes = nodesFor(c);
  const na = nextAction(c);
  const [peek, setPeek] = useState<number | null>(null);

  return (
    <ol className="space-y-2">
      {GATES.map((gate) => {
        const complete = gate.no < g;
        const active = gate.no === g;
        const locked = gate.no > g;
        const open = active || peek === gate.no;
        const list = nodes[gate.no] ?? [];
        const current = list.find((n) => n.state === "current");
        return (
          <li key={gate.no}>
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border-2 px-4 py-2",
                complete && "border-foreground bg-warning text-foreground",
                active && "border-foreground bg-muted text-foreground",
                locked && "border-border bg-card text-muted-foreground opacity-70",
              )}
            >
              <span className="label-caps flex-1 font-bold">
                Step {gate.no} · {gate.title}
              </span>
              <span className="rounded-full border border-current px-1.5 py-0.5 font-mono text-[10px]">
                {c.code}
              </span>
              {locked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={open ? "Collapse" : "Expand"}
                  disabled={active}
                  onClick={() => setPeek(peek === gate.no ? null : gate.no)}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-current"
                >
                  {open ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </button>
              )}
            </div>
            {open && (
              <div className="ml-4 mt-1.5 space-y-1 border-l-2 border-border pl-3">
                {list.map((n) => {
                  if (n.state === "done")
                    return (
                      <p key={n.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-success" /> {n.label}
                      </p>
                    );
                  if (active && n !== current) return null;
                  return (
                    <div key={n.id} className="animate-throb-aqua rounded-md border p-2.5 text-xs">
                      <p className="font-medium">{n.label}</p>
                      <Link
                        to="/clients/$clientId"
                        params={{ clientId: c.id }}
                        className="mt-1 inline-block text-primary hover:underline"
                      >
                        {na.text} →
                      </Link>
                    </div>
                  );
                })}
                {list.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {complete ? "Complete." : "Issued policies, audit trail and annual review."}
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
