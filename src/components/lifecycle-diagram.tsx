import {
  BadgeCheck,
  Calculator,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Lock,
  PenLine,
  Repeat,
  ScanFace,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
    title: "Client gateway",
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
    title: "Needs analysis",
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
    title: "Issuance & review",
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

/* Desktop geometry (px). Cards sit in a 3 x 3 grid; the hub is the middle row. */
const ROW = 252;
const MID = 170;
const H = ROW * 2 + MID;
const Y_TOP = ROW / 2;
const Y_MID = ROW + MID / 2;
const Y_BOT = H - ROW / 2;

export interface LifecycleDiagramProps {
  /** Small label shown on a stage card, e.g. "2 clients here". */
  chips?: Partial<Record<StageNo, string>>;
  /** Stage to highlight as "you are here". */
  active?: StageNo | undefined;
  /** Show the built-in eyebrow, headline and subtitle. Pages with their own heading turn this off. */
  heading?: boolean;
}

function StageCard({
  def,
  chip,
  active,
}: {
  def: StageDef;
  chip: string | undefined;
  active: boolean;
}) {
  const Icon = def.icon;
  const FooterIcon = def.footerIcon;
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border bg-navy-card text-navy-foreground",
        active ? "border-brand shadow-[0_0_28px_-6px_var(--brand)]" : "border-white/10",
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-brand-foreground">
          {def.no}
        </span>
        <Icon className="h-3.5 w-3.5 text-navy-foreground/60" />
        <span className="text-[13px] font-medium">{def.title}</span>
        {active && (
          <span className="ml-auto rounded bg-brand px-1.5 py-0.5 text-[10px] font-medium text-brand-foreground">
            You are here
          </span>
        )}
      </div>
      <ul className="flex-1 divide-y divide-white/5">
        {def.rows.map((r) => (
          <li key={r.text} className="flex items-center gap-2 px-3 py-1.5">
            <span
              className={cn(
                "w-[54px] shrink-0 rounded px-1 py-0.5 text-center font-mono text-[9px] font-medium leading-3 tracking-wide",
                ACTOR_STYLE[r.actor],
              )}
            >
              {r.actor}
            </span>
            <span className="text-xs leading-4 text-navy-foreground/85">{r.text}</span>
          </li>
        ))}
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
    </div>
  );
}

function Hub() {
  return (
    <div className="flex w-56 flex-col items-center rounded-lg bg-navy px-3 py-1 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_0_48px_-2px_var(--brand)]">
        <LogoMark className="h-8 w-8" />
      </span>
      <p className="mt-2 text-[13px] font-medium text-navy-foreground">Compliance engine</p>
      <ul className="mt-1 space-y-0.5">
        {ENGINE_POINTS.map((p) => (
          <li
            key={p}
            className="flex items-center justify-center gap-1.5 text-[11px] text-navy-foreground/60"
          >
            <Check className="h-3 w-3 text-brand" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArrowDot({ icon: Icon, style }: { icon: LucideIcon; style: React.CSSProperties }) {
  return (
    <span
      className="absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-navy text-brand"
      style={style}
      aria-hidden
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

/** Connector geometry in pixels for a container of width `w`. */
function paths(w: number) {
  const cx = [w / 6, w / 2, (5 * w) / 6] as const;
  return {
    flow: `M ${cx[0]} ${Y_TOP} H ${cx[2]} V ${Y_BOT} H ${cx[0]}`,
    loop: `M ${cx[0]} ${Y_BOT} V ${Y_TOP}`,
    hubUp: `M ${cx[1]} ${Y_MID} V ${Y_TOP}`,
    hubDown: `M ${cx[1]} ${Y_MID} V ${Y_BOT}`,
    hubLeft: `M ${cx[1]} ${Y_MID} H ${cx[0]}`,
    hubRight: `M ${cx[1]} ${Y_MID} H ${cx[2]}`,
    cx,
  };
}

export function LifecycleDiagram({ chips = {}, active, heading = true }: LifecycleDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1152);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const p = paths(w);
  const pct = (x: number) => `${(x / w) * 100}%`;
  const at = (n: StageNo) => STAGES.find((s) => s.no === n)!;

  return (
    <section
      className="mb-8 overflow-hidden rounded-lg border border-white/10 bg-navy px-4 py-8 text-navy-foreground sm:px-8"
      aria-label="The advice lifecycle"
    >
      {heading && (
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
            The advice lifecycle
          </p>
          <h2 className="mt-2 text-2xl font-medium leading-8 sm:text-3xl sm:leading-10">
            From first scan to annual review, in a fixed legal order.
          </h2>
          <p className="mt-2 text-sm text-navy-foreground/65">
            Every step is checked by the compliance engine. Out-of-order actions are refused and
            logged.
          </p>
        </div>
      )}

      {/* Desktop: snaking flow around the hub */}
      <div ref={ref} className="relative mx-auto hidden max-w-6xl lg:block" style={{ height: H }}>
        <svg
          className="absolute inset-0"
          width={w}
          height={H}
          viewBox={`0 0 ${w} ${H}`}
          aria-hidden
        >
          <g fill="none" strokeLinejoin="round" strokeLinecap="round">
            <path d={p.flow} stroke="white" strokeOpacity={0.16} strokeWidth={1} />
            <path
              d={p.loop}
              stroke="white"
              strokeOpacity={0.16}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            {[p.hubUp, p.hubDown, p.hubLeft, p.hubRight].map((d) => (
              <path
                key={d}
                d={d}
                stroke="white"
                strokeOpacity={0.08}
                strokeWidth={1}
                strokeDasharray="3 5"
              />
            ))}
            <path d={p.flow} stroke="var(--brand)" strokeWidth={2} className="flow-light" />
            <path
              d={p.loop}
              stroke="var(--brand)"
              strokeWidth={2}
              className="flow-light"
              style={{ animationDelay: "-2s" }}
            />
          </g>
        </svg>

        <div
          className="absolute inset-0 grid grid-cols-3"
          style={{ gridTemplateRows: `${ROW}px ${MID}px ${ROW}px` }}
        >
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="px-6 py-2">
              <StageCard def={at(n)} chip={chips[n]} active={active === n} />
            </div>
          ))}
          <div className="col-span-3 flex items-center justify-center">
            <Hub />
          </div>
          {([6, 5, 4] as const).map((n) => (
            <div key={n} className="px-6 py-2">
              <StageCard def={at(n)} chip={chips[n]} active={active === n} />
            </div>
          ))}
        </div>

        <ArrowDot icon={ChevronRight} style={{ left: pct(w / 3), top: Y_TOP }} />
        <ArrowDot icon={ChevronRight} style={{ left: pct((2 * w) / 3), top: Y_TOP }} />
        <ArrowDot icon={ChevronDown} style={{ left: pct(p.cx[2]), top: Y_MID }} />
        <ArrowDot icon={ChevronLeft} style={{ left: pct((2 * w) / 3), top: Y_BOT }} />
        <ArrowDot icon={ChevronLeft} style={{ left: pct(w / 3), top: Y_BOT }} />
        <span
          className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-navy px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-navy-foreground/70"
          style={{ left: pct(p.cx[0]), top: Y_MID }}
        >
          <Repeat className="h-3 w-3 text-brand" /> Annual review cycle
        </span>
      </div>

      {/* Below lg: a single vertical flow */}
      <div className="relative mx-auto max-w-md lg:hidden">
        <div className="absolute bottom-4 left-3 top-4 w-px bg-white/15" aria-hidden />
        <ol className="space-y-5">
          {STAGES.map((s) => (
            <li key={s.no} className="relative pl-9">
              <span
                className="absolute left-0 top-4 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-navy text-brand"
                aria-hidden
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </span>
              <StageCard def={s} chip={chips[s.no]} active={active === s.no} />
            </li>
          ))}
        </ol>
        <div className="mt-6 flex justify-center">
          <Hub />
        </div>
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wide text-navy-foreground/60">
          <Repeat className="mr-1 inline h-3 w-3 text-brand" /> Repeats every 12 months
        </p>
      </div>
    </section>
  );
}
