import { isComplete } from "@/lib/domain/gates";
import { verifyLedger } from "@/lib/domain/ledger";
import { nextAction } from "@/lib/domain/next-action";
import { useAppState } from "@/lib/domain/store";
import { PROVIDERS, type AppState } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "danger" | "success" | "warning" | undefined;
}

/** The headline numbers for whoever is looking. These used to sit at the top of each dashboard. */
function statsFor(s: AppState): Stat[] {
  const { role, insurerId } = s.session;

  if (role === "insurer") {
    const apps = s.cases.flatMap((c) =>
      c.applications.filter((a) => a.providerId === insurerId).map((a) => ({ c, a })),
    );
    const pending = apps.filter((x) => x.a.status === "submitted");
    const issued = apps.filter((x) => x.a.status === "issued");
    const medical = pending.filter((x) => x.a.needsMedical && !x.c.execution.medicalCompletedAt);
    const line = PROVIDERS.find((p) => p.id === insurerId)?.line;
    return [
      {
        label: "Awaiting decision",
        value: pending.length,
        tone: pending.length ? "warning" : undefined,
      },
      {
        label: "Medical outstanding",
        value: medical.length,
        hint: "Client has not completed disclosure",
      },
      { label: "Policies issued", value: issued.length, tone: "success" },
      { label: "Product line", value: line === "life" ? "Life & risk" : "Short-term" },
    ];
  }

  if (role === "fsp") {
    const chain = verifyLedger(s.ledger);
    const blocked = s.ledger.filter((e) => e.type === "GATE_BLOCKED");
    const escalations = s.cases.filter((c) => c.identity.sanctions === "hit");
    const alerts = s.cases.filter((c) => c.astute.alert && !c.astute.alert.resolvedAt);
    return [
      {
        label: "Audit ledger",
        value: chain.ok ? "Intact" : "Broken",
        tone: chain.ok ? "success" : "danger",
        hint: `${s.ledger.length} entries verified`,
      },
      {
        label: "Escalations",
        value: escalations.length,
        tone: escalations.length ? "danger" : "success",
        hint: "Sanctions / PEP matches",
      },
      {
        label: "Open Astute alerts",
        value: alerts.length,
        tone: alerts.length ? "warning" : "success",
        hint: "Other brokerages querying clients",
      },
      {
        label: "Non-compliant steps stopped",
        value: blocked.length,
        hint: "Refused by hard rules",
      },
    ];
  }

  // advisor
  const mine = s.cases.filter((c) => c.advisorId === s.advisors[0]?.id);
  const ids = new Set(mine.map((c) => c.id));
  const active = mine.filter((c) => !isComplete(c));
  const attention = active.filter((c) => {
    const o = nextAction(c).owner;
    return o === "advisor" || o === "fsp";
  });
  const waiting = active.filter((c) => nextAction(c).owner === "client");
  const blocked = s.ledger.filter(
    (e) => e.type === "GATE_BLOCKED" && e.caseId && ids.has(e.caseId),
  ).length;
  return [
    { label: "Active clients", value: active.length, hint: `${mine.length} in total` },
    {
      label: "Needs your action",
      value: attention.length,
      tone: attention.length ? "warning" : undefined,
      hint: "Cases where you are next",
    },
    {
      label: "Waiting on clients",
      value: waiting.length,
      hint: "Signatures, uploads, verification",
    },
    {
      label: "Blocked by rules",
      value: blocked,
      tone: blocked ? "danger" : "success",
      hint: "Attempts refused and logged",
    },
  ];
}

const TONE = {
  danger: "text-negative",
  success: "text-positive",
  warning: "text-warning",
} as const;

/** Compact stat grid for the top of the Live workspace panel. */
export function LiveStats() {
  const stats = statsFor(useAppState());
  return (
    <dl className="grid grid-cols-2 gap-3">
      {stats.map((st) => (
        <div key={st.label} className="rounded-md bg-background p-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {st.label}
          </dt>
          <dd className={cn("title-lg mt-1 text-xl", st.tone && TONE[st.tone])}>{st.value}</dd>
          {st.hint && <p className="mt-0.5 text-xs text-muted-foreground">{st.hint}</p>}
        </div>
      ))}
    </dl>
  );
}
