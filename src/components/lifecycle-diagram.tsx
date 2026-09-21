import {
  BadgeCheck,
  Calculator,
  Check,
  ChevronDown,
  Database,
  FileText,
  Lock,
  PenLine,
  Repeat,
  ScanFace,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { LogoMark } from "@/components/brand/logo";
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
    title: "Client Gateway",
    icon: ScanFace,
    rows: [
      { actor: "CLIENT", text: "Scan QR or open secure link" },
      { actor: "SYSTEM", text: "Liveness and Home Affairs ID" },
      { actor: "SYSTEM", text: "L0 sanctions and PEP screen" },
      { actor: "CLIENT", text: "Sign disclosure and LOA" },
    ],
    footer: "No advice until all four pass",
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

const ACTOR_STYLE: Record<Actor, string> = {
  CLIENT: "bg-brand/15 text-brand",
  ADVISOR: "bg-chart-4/15 text-chart-4",
  SYSTEM: "bg-white/10 text-navy-foreground/70",
  INSURER: "bg-warning/20 text-warning",
};

const ENGINE_POINTS = [
  "Hard gates on every step",
  "Hash-chained audit ledger",
  "Key Individual oversight",
];

function StageCard({
  def,
  chip,
  active,
  selected = false,
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
        "flex h-full flex-col rounded-lg border bg-navy-card text-navy-foreground",
        active
          ? "pulse-border border-brand"
          : selected
            ? "border-brand shadow-[0_0_28px_-6px_var(--brand)]"
            : "border-white/10",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2.5",
          expanded && "border-b border-white/10",
        )}
      >
        <button
          type="button"
          onClick={onSelect ?? onToggle}
          aria-pressed={onSelect ? selected : undefined}
          className={cn("flex min-w-0 flex-1 items-center gap-2 text-left hover:opacity-90", focus)}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-brand-foreground">
            {def.no}
          </span>
          <Icon className="h-3.5 w-3.5 shrink-0 text-navy-foreground/60" />
          <span className="truncate text-[13px] font-medium">{def.title}</span>
        </button>
        {chip && !expanded && (
          <span className="shrink-0 rounded bg-brand/15 px-1.5 py-0.5 text-[11px] font-medium text-brand">
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
          className={cn("shrink-0 p-0.5 text-navy-foreground/60 hover:text-navy-foreground", focus)}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", !expanded && "-rotate-90")} />
        </button>
      </div>
      {expanded && (
        <>
          <ul className="flex-1 divide-y divide-white/5">
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
                      "pulse-border mx-1.5 my-1 rounded-md border border-brand bg-brand/10",
                  )}
                >
                  {tracked && (
                    <span className="flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden>
                      {done ? (
                        <Check className="h-3 w-3 text-positive" />
                      ) : current ? (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70 motion-reduce:animate-none" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                        </span>
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
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
                      done ? "text-navy-foreground/50" : "text-navy-foreground/85",
                      current && "font-medium text-navy-foreground",
                    )}
                  >
                    {r.text}
                  </span>
                  {current && (
                    <span className="ml-auto shrink-0 text-[10px] font-medium text-brand">
                      Next
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2 text-[11px] leading-3.5 text-navy-foreground/55">
            <span className="flex items-center gap-1.5">
              {FooterIcon && <FooterIcon className="h-3 w-3 shrink-0" />}
              {def.footer}
            </span>
            {chip && (
              <span className="shrink-0 rounded bg-brand/15 px-1.5 py-0.5 font-medium text-brand">
                {chip}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Hub() {
  return (
    <div className="flex w-56 flex-col items-center rounded-lg bg-card px-3 py-1 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border bg-card shadow-[0_0_40px_-4px_var(--brand)]">
        <LogoMark className="h-8 w-8" />
      </span>
      <p className="mt-2 text-[13px] font-medium text-foreground">Compliance engine</p>
      <ul className="mt-1 space-y-0.5">
        {ENGINE_POINTS.map((p) => (
          <li
            key={p}
            className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <Check className="h-3 w-3 text-brand-ink" />
            {p}
          </li>
        ))}
      </ul>
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
}: {
  chips?: Partial<Record<StageNo, string>>;
  active?: StageNo | undefined;
  selected?: StageNo | null;
  /** Lets the title of each card select its stage, e.g. to filter a live view. */
  onSelect?: ((n: StageNo | null) => void) | undefined;
  /** How many lines of the client's current step are done (marks the next line). */
  rowsDone?: number | undefined;
}) {
  // Step 1 starts open. A client's own current step also opens, so the line they are on is visible.
  const [open, setOpen] = useState<Set<StageNo>>(
    () => new Set<StageNo>(active ? [1, active] : [1]),
  );

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

  return (
    <div className="relative">
      <div className="absolute bottom-4 left-3 top-4 w-px overflow-hidden bg-border" aria-hidden>
        <span className="flow-light-v absolute left-0 h-16 w-px bg-gradient-to-b from-transparent via-brand to-transparent" />
      </div>
      <ol className="space-y-4">
        {STAGES.map((s) => (
          <li key={s.no} className="relative pl-9">
            <span
              className="absolute left-0 top-3 flex h-6 w-6 items-center justify-center rounded-full border bg-card text-brand-ink"
              aria-hidden
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </span>
            <StageCard
              def={s}
              chip={chips[s.no]}
              active={active === s.no}
              selected={selected === s.no}
              expanded={open.has(s.no)}
              onToggle={() => toggle(s.no)}
              rowsDone={active === s.no ? rowsDone : undefined}
              onSelect={onSelect ? () => onSelect(selected === s.no ? null : s.no) : undefined}
            />
          </li>
        ))}
      </ol>
      <div className="mt-6 flex justify-center">
        <Hub />
      </div>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        <Repeat className="mr-1 inline h-3 w-3 text-brand-ink" /> Annual review cycle: repeats every
        12 months
      </p>
    </div>
  );
}
