import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Calculator,
  Check,
  ChevronDown,
  Database,
  FileText,
  FolderOpen,
  Lock,
  PenLine,
  Repeat,
  ScanFace,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { StageNo } from "@/lib/domain/gates";
import { cn } from "@/lib/utils";

type Actor = "CLIENT" | "ADVISOR" | "SYSTEM" | "INSURER";

interface StageDef {
  no: StageNo;
  title: string;
  icon: LucideIcon;
  rows: { actor: Actor; text: string }[];
  footer: string;
  footerIcon?: LucideIcon;
}

const STAGES: StageDef[] = [
  {
    no: 1,
    title: "Client Onboarding",
    icon: ScanFace,
    rows: [
      { actor: "ADVISOR", text: "Register new client (name and email)" },
      { actor: "CLIENT", text: "Verify email address" },
      { actor: "CLIENT", text: "Liveness and Home Affairs ID" },
      { actor: "SYSTEM", text: "L0 sanctions and PEP screen" },
      { actor: "CLIENT", text: "Sign disclosure and LOA" },
    ],
    footer: "No advice until every step passes",
    footerIcon: Lock,
  },
  {
    no: 2,
    title: "Portfolio",
    icon: Database,
    rows: [
      { actor: "SYSTEM", text: "Astute pull: life, disability, investments" },
      { actor: "SYSTEM", text: "Insurer schedules and claims history" },
      { actor: "SYSTEM", text: "Cross-alert check" },
      { actor: "SYSTEM", text: "Push profile to CRM" },
    ],
    footer: "Locked until the mandate is re-signed if another brokerage queries",
  },
  {
    no: 3,
    title: "Needs Analysis",
    icon: Calculator,
    rows: [
      { actor: "ADVISOR", text: "Capture facts and risk profile" },
      { actor: "SYSTEM", text: "Life, short-term and investment gaps" },
      { actor: "SYSTEM", text: "Estate duty estimate" },
      { actor: "CLIENT", text: "Or: single-need disclaimer" },
    ],
    footer: "Same inputs, same result",
  },
  {
    no: 4,
    title: "Quotes & ROA",
    icon: FileText,
    rows: [
      { actor: "SYSTEM", text: "Quote 6 insurers, rank top 3" },
      { actor: "ADVISOR", text: "Select options and commentary" },
      { actor: "SYSTEM", text: "Affordability check" },
      { actor: "SYSTEM", text: "Generate ROA (versioned)" },
    ],
    footer: "Any change makes a new version, re-sign",
  },
  {
    no: 5,
    title: "Presentation",
    icon: PenLine,
    rows: [
      { actor: "ADVISOR", text: "Present ROA and comparison" },
      { actor: "CLIENT", text: "Sign ROA" },
      { actor: "CLIENT", text: "FICA documents and bank validation" },
      { actor: "CLIENT", text: "Debit order and life declaration" },
      { actor: "CLIENT", text: "Health disclosure (encrypted)" },
    ],
    footer: "Submission blocked until complete",
  },
  {
    no: 6,
    title: "Issuance & Review",
    icon: BadgeCheck,
    rows: [
      { actor: "INSURER", text: "Accept, decline or issue" },
      { actor: "SYSTEM", text: "Policy schedule to portal and CRM" },
      { actor: "SYSTEM", text: "Schedule annual review" },
      { actor: "CLIENT", text: "Acknowledge renewal" },
    ],
    footer: "Repeats every 12 months",
    footerIcon: Repeat,
  },
];

export const STAGE_DEFS = STAGES;
export type { Actor, StageDef };

export const ACTOR_STYLE: Record<Actor, string> = {
  CLIENT: "bg-brand-soft text-brand-ink",
  ADVISOR: "bg-primary-soft text-primary",
  SYSTEM: "bg-secondary text-muted-foreground",
  INSURER: "bg-warning-soft text-warning",
};

type StageState = "done" | "current" | "todo";

function StageCard({
  def,
  chip,
  active,
  selected = false,
  state,
  expanded,
  onToggle,
  onSelect,
  rowsDone,
}: {
  def: StageDef;
  chip: string | undefined;
  active: boolean;
  /** Marks this stage as the one the live view is filtered to. */
  selected?: boolean;
  /** Done is green, current is teal, still to come is grey. */
  state: StageState;
  expanded: boolean;
  onToggle: () => void;
  /** When set, the title selects this stage (e.g. to filter the live view); otherwise it toggles. */
  onSelect?: (() => void) | undefined;
  /** On the client's current step: how many lines are done. The next line is marked. */
  rowsDone?: number | undefined;
}) {
  const Icon = def.icon;
  const FooterIcon = def.footerIcon;
  const focus =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md";
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        active
          ? "pulse-border border-brand"
          : selected
            ? "border-brand shadow-[0_0_28px_-6px_var(--brand)]"
            : "border-border",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "h-1",
          state === "done" ? "bg-positive" : state === "current" ? "bg-brand" : "bg-border",
        )}
      />
      <div className={cn("flex items-center gap-2 px-3 py-2.5", expanded && "border-b")}>
        <button
          type="button"
          onClick={onSelect ?? onToggle}
          aria-pressed={onSelect ? selected : undefined}
          className={cn("flex min-w-0 flex-1 items-center gap-2 text-left hover:opacity-90", focus)}
        >
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
              state === "done"
                ? "bg-positive text-white"
                : state === "current"
                  ? "bg-brand text-brand-foreground"
                  : "bg-secondary text-muted-foreground",
            )}
          >
            {state === "done" ? <Check className="h-3 w-3" /> : def.no}
          </span>
          <Icon className="h-3.5 w-3.5 shrink-0 text-brand-ink" />
          <span className="truncate text-[13px] font-medium">{def.title}</span>
        </button>
        {chip && !expanded && (
          <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-brand-ink">
            {chip}
          </span>
        )}
        {active && (
          <span className="shrink-0 rounded bg-brand px-1.5 py-0.5 text-[10px] font-medium text-brand-foreground">
            You are here
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${def.title}`}
          className={cn("shrink-0 p-0.5 text-muted-foreground hover:text-foreground", focus)}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", !expanded && "-rotate-90")} />
        </button>
      </div>
      {expanded && (
        <>
          <ul className="flex-1 divide-y divide-border">
            {def.rows.map((r, i) => {
              const tracked = active && rowsDone !== undefined;
              const done = tracked && i < rowsDone;
              const current = tracked && i === rowsDone;
              return (
                <li
                  key={r.text}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5",
                    current &&
                      "pulse-border mx-1.5 my-1 rounded-md border border-brand bg-brand-soft",
                  )}
                >
                  {tracked && (
                    <span className="flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden>
                      {done ? (
                        <Check className="h-3 w-3 text-positive" />
                      ) : current ? (
                        <span className="relative flex h-2 w-2">
                          <span className="soft-ping absolute inline-flex h-full w-full rounded-full bg-brand" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                        </span>
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-border" />
                      )}
                    </span>
                  )}
                  <span
                    className={cn(
                      "w-[54px] shrink-0 rounded px-1 py-0.5 text-center font-mono text-[9px] font-medium leading-3 tracking-wide",
                      ACTOR_STYLE[r.actor],
                    )}
                  >
                    {r.actor}
                  </span>
                  <span
                    className={cn(
                      "text-xs leading-4",
                      done ? "text-muted-foreground" : "text-foreground/85",
                      current && "font-medium text-foreground",
                    )}
                  >
                    {r.text}
                  </span>
                  {current && (
                    <span className="ml-auto shrink-0 text-[10px] font-medium text-brand-ink">
                      Next
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[11px] leading-3.5 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {FooterIcon && <FooterIcon className="h-3 w-3 shrink-0" />}
              {def.footer}
            </span>
            {chip && (
              <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 font-medium text-brand-ink">
                {chip}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The lifecycle as a single top-to-bottom flow, used in the Live Workspace flow-map frame.
 * Every step starts collapsed except step 1; a chevron expands or collapses each one.
 */
export function LifecycleFlow({
  chips = {},
  active,
  selected = null,
  onSelect,
  rowsDone,
  complete = false,
  documentCount,
}: {
  chips?: Partial<Record<StageNo, string>>;
  active?: StageNo | undefined;
  selected?: StageNo | null;
  /** Lets the title of each card select its stage, e.g. to filter a live view. */
  onSelect?: ((n: StageNo | null) => void) | undefined;
  /** How many lines of the client's current step are done (marks the next line). */
  rowsDone?: number | undefined;
  /** The client's whole journey is done, so every step shows as done. */
  complete?: boolean;
  /** Number of documents shown on the central Documents tile. */
  documentCount?: number;
}) {
  const stateOf = (n: StageNo): StageState => {
    if (active) return complete || n < active ? "done" : n === active ? "current" : "todo";
    return selected === n ? "current" : "todo";
  };
  // Every step starts open, matching the perimeter map; a chevron collapses each one.
  const [open, setOpen] = useState<Set<StageNo>>(() => new Set<StageNo>([1, 2, 3, 4, 5, 6]));

  // A stage chosen elsewhere (for example a filter chip) opens so its detail is visible.
  useEffect(() => {
    if (selected) setOpen((prev) => (prev.has(selected) ? prev : new Set(prev).add(selected)));
  }, [selected]);

  const toggle = (n: StageNo) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const card = (n: StageNo) => {
    const s = STAGES[n - 1]!;
    return (
      <StageCard
        def={s}
        chip={chips[s.no]}
        active={active === s.no}
        selected={selected === s.no}
        state={stateOf(s.no)}
        expanded={open.has(s.no)}
        onToggle={() => toggle(s.no)}
        rowsDone={active === s.no ? rowsDone : undefined}
        onSelect={onSelect ? () => onSelect(selected === s.no ? null : s.no) : undefined}
      />
    );
  };

  const gridRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<Partial<Record<StageNo, HTMLDivElement | null>>>({});
  const [paths, setPaths] = useState<{ d: string; tone: "done" | "next" | "todo" }[]>([]);

  const measure = useCallback(() => {
    const g = gridRef.current;
    if (!g) return;
    const o = g.getBoundingClientRect();
    const r = (n: StageNo) => {
      const el = frameRefs.current[n];
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { l: b.left - o.left, t: b.top - o.top, r: b.right - o.left, b: b.bottom - o.top };
    };
    const order: StageNo[] = [1, 2, 3, 4, 5, 6, 3];
    const out: { d: string; tone: "done" | "next" | "todo" }[] = [];
    for (let i = 0; i < order.length - 1; i++) {
      const from = order[i]!;
      const to = order[i + 1]!;
      const a = r(from);
      const b = r(to);
      if (!a || !b) continue;
      const hy = (x: { t: number; b: number }) => Math.min(x.t + 22, (x.t + x.b) / 2);
      let d: string;
      if (from === 4 && to === 5) {
        // Straight down from step 4 to the vertical middle of step 5, then turn left into it.
        const x1 = (a.l + a.r) / 2, my = (b.t + b.b) / 2;
        d = `M${x1},${a.b} V${my} H${b.r}`;
      } else if (from === 5 && to === 6) {
        // A single straight arrow from the top of step 5 to the bottom of step 6.
        const x = (a.l + a.r) / 2;
        d = `M${x},${a.t} V${b.b}`;
      } else if (from === 6 && to === 3) {
        // Annual review cycle: loops back up into step 3 (re-assess needs), not step 1.
        const x1 = (a.l + a.r) / 2, x2 = (b.l + b.r) / 2, my = (a.t + b.b) / 2;
        d = `M${x1},${a.t} V${my} H${x2} V${b.b}`;
      } else if (b.l >= a.r) {
        // to the right: right edge -> left edge
        const y1 = hy(a), y2 = hy(b), mx = (a.r + b.l) / 2;
        d = `M${a.r},${y1} H${mx} V${y2} H${b.l}`;
      } else if (b.r <= a.l) {
        const y1 = hy(a), y2 = hy(b), mx = (a.l + b.r) / 2;
        d = `M${a.l},${y1} H${mx} V${y2} H${b.r}`;
      } else if (b.t >= a.b) {
        // below: bottom edge -> top edge
        const x1 = (Math.max(a.l, b.l) + Math.min(a.r, b.r)) / 2;
        const my = (a.b + b.t) / 2;
        const x2 = x1;
        d = `M${x1},${a.b} V${my} H${x2} V${b.t}`;
      } else {
        // above (loop back): run up the outside left edge
        const x = Math.min(a.l, b.l) - 12;
        d = `M${a.l},${hy(a)} H${x} V${hy(b)} H${b.l}`;
      }
      const sa = stateOf(from), sb = stateOf(to);
      out.push({ d, tone: sa === "done" && sb === "done" ? "done" : sb === "current" ? "next" : "todo" });
    }
    setPaths(out);
  }, [active, complete, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    measure();
    const g = gridRef.current;
    if (!g) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(g);
    Object.values(frameRefs.current).forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [measure, open]);

  const frame = (n: StageNo, cls: string) => (
    <div ref={(el) => { frameRefs.current[n] = el; }} className={cn("relative z-10", cls)}>
      {card(n)}
    </div>
  );

  // Perimeter loop: 1 → 2 → 3 → 4 down the right, 5 along the bottom, 6 back up the left,
  // with the Documents tile in the middle of the loop.
  return (
    <div>
      <div ref={gridRef} className="relative grid gap-8 pl-4 md:grid-cols-2 md:gap-x-12">
        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            {(["todo", "done", "next"] as const).map((t) => (
              <marker key={t} id={`lw-arrow-${t}`} viewBox="0 0 8 8" refX="8" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L8,4 L0,8 z" className={t === "done" ? "fill-positive" : t === "next" ? "fill-brand" : "fill-muted-foreground"} />
              </marker>
            ))}
          </defs>
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill="none" strokeWidth={1} markerEnd={`url(#lw-arrow-${p.tone})`} className={p.tone === "done" ? "stroke-positive" : p.tone === "next" ? "stroke-brand" : "stroke-muted-foreground"} />
          ))}
        </svg>
        {frame(1, "md:col-start-1 md:row-start-1")}
        {frame(2, "md:col-start-2 md:row-start-1 md:mt-10")}
        <div className="md:col-start-1 md:row-start-2 relative z-10 flex items-center justify-start">
          <Link
            to="/reports"
            className="group flex w-44 flex-col items-center gap-2 rounded-lg bg-secondary p-4 transition-colors hover:bg-brand-soft"
          >
            <span className="relative flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/40 group-hover:border-brand">
              <FolderOpen className="h-10 w-10 text-muted-foreground group-hover:text-brand-ink" />
              {documentCount !== undefined && (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-brand-foreground">
                  {documentCount}
                </span>
              )}
            </span>
            <span className="label-caps text-muted-foreground">Documents</span>
          </Link>
        </div>
        {frame(3, "md:col-start-2 md:row-start-2")}
        {frame(6, "md:col-start-1 md:row-start-3 md:mt-16")}
        {frame(4, "md:col-start-2 md:row-start-3")}
        {frame(5, "md:col-start-1 md:row-start-4 md:ml-16 md:-mr-16")}
      </div>
      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        <Repeat className="mr-1 inline h-3 w-3 text-brand-ink" /> Annual review cycle: repeats every
        12 months
      </p>
    </div>
  );
}
