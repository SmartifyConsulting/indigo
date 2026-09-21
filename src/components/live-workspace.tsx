import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { ActivityList } from "@/components/dashboards";
import { OnDarkContext, PageHeader, StageBadge } from "@/components/common";
import { LifecycleFlow } from "@/components/lifecycle-diagram";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STAGES, getStage, isComplete, type StageNo } from "@/lib/domain/gates";
import { lifecycleView } from "@/lib/domain/lifecycle";
import { nextAction } from "@/lib/domain/next-action";
import { useAppState } from "@/lib/domain/store";
import { providerName, type CaseRecord } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const inStage = (c: CaseRecord, n: StageNo) => getStage(c) === n && (n === 6 || !isComplete(c));

function LiveDot() {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium text-positive">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
      </span>
      Live
    </span>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Advisor and FSP view: every client, filterable by lifecycle stage. */
function ClientsView({
  selected,
  onSelect,
}: {
  selected: StageNo | null;
  onSelect: (n: StageNo | null) => void;
}) {
  const s = useAppState();
  const isAdvisor = s.session.role === "advisor";
  const mine = isAdvisor ? s.cases.filter((c) => c.advisorId === s.advisors[0]?.id) : s.cases;
  const ids = new Set(mine.map((c) => c.id));
  const active = mine.filter((c) => !isComplete(c));
  const owner = isAdvisor ? "advisor" : "fsp";
  const needsYou = active.filter((c) => nextAction(c).owner === owner).length;
  const rows = mine.filter((c) => (selected ? inStage(c, selected) : true));

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {active.length} active {active.length === 1 ? "client" : "clients"} ·{" "}
        <span className={needsYou ? "font-medium text-warning" : undefined}>
          {needsYou} {isAdvisor ? "need you" : "with the Key Individual"}
        </span>
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by stage">
        {([null, ...STAGES.map((st) => st.no)] as (StageNo | null)[]).map((n) => {
          const count = n ? mine.filter((c) => inStage(c, n)).length : mine.length;
          return (
            <button
              key={n ?? "all"}
              type="button"
              onClick={() => onSelect(selected === n ? null : n)}
              aria-pressed={selected === n}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                selected === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground",
              )}
            >
              {n ?? "All"}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <Empty>No clients at this stage.</Empty>
      ) : (
        <ul className="mt-3 divide-y">
          {rows
            .slice()
            .sort((a, b) => getStage(a) - getStage(b))
            .map((c) => {
              const na = nextAction(c);
              return (
                <li key={c.id}>
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: c.id }}
                    className="flex items-center justify-between gap-3 py-3 hover:text-primary"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.clientName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {na.text}
                        {na.owner !== "none" && (
                          <span className="capitalize">
                            {" "}
                            ({na.owner === "fsp" ? "Key Individual" : na.owner})
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <StageBadge c={c} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </Link>
                </li>
              );
            })}
        </ul>
      )}

      <div className="mt-4 border-t pt-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent activity
        </p>
        <ActivityList s={s} caseIds={ids} limit={5} />
      </div>
    </>
  );
}

/** Client view: their own step and what to do next. */
function ClientView() {
  const s = useAppState();
  const c = s.cases.find((x) => x.id === s.session.clientCaseId) ?? s.cases[0];
  if (!c) return <Empty>No client selected.</Empty>;
  const na = nextAction(c);
  const stage = getStage(c);
  const complete = isComplete(c);

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Where you are
      </p>
      <p className="title-lg mt-1">
        {complete ? "Your cover is in place" : `Step ${stage} of 6: ${STAGES[stage - 1]!.title}`}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-background p-4">
        <div>
          <p className="text-xs text-muted-foreground">Next step</p>
          <p className="text-sm font-medium">{na.text}</p>
        </div>
        {stage === 1 ? (
          <Button asChild size="sm">
            <Link to="/onboard/$code" params={{ code: c.code }}>
              Continue onboarding
            </Link>
          </Button>
        ) : na.owner === "client" ? (
          <Button asChild size="sm">
            <Link to="/actions">Go to actions</Link>
          </Button>
        ) : null}
      </div>
      <div className="mt-4 border-t pt-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent activity
        </p>
        <ActivityList s={s} caseIds={new Set([c.id])} limit={5} />
      </div>
    </>
  );
}

/** Insurer view: applications waiting for a decision. */
function InsurerView() {
  const s = useAppState();
  const me = s.session.insurerId;
  const waiting = s.cases.flatMap((c) =>
    c.applications
      .filter((a) => a.providerId === me && a.status === "submitted")
      .map((a) => ({ c, a })),
  );
  const ids = new Set(
    s.cases.filter((c) => c.applications.some((a) => a.providerId === me)).map((c) => c.id),
  );

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {waiting.length} {waiting.length === 1 ? "application" : "applications"} awaiting{" "}
        {providerName(me)}
      </p>
      {waiting.length === 0 ? (
        <Empty>Nothing is waiting on you.</Empty>
      ) : (
        <ul className="mt-3 divide-y">
          {waiting.map(({ c, a }) => (
            <li key={a.quoteId}>
              <Link
                to="/applications"
                className="flex items-center justify-between gap-3 py-3 hover:text-primary"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.clientName}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.product}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 border-t pt-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent activity
        </p>
        <ActivityList s={s} caseIds={ids} limit={5} />
      </div>
    </>
  );
}

export function LiveWorkspacePanel({
  selected,
  onSelect,
}: {
  selected: StageNo | null;
  onSelect: (n: StageNo | null) => void;
}) {
  const { session } = useAppState();
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="title-lg">Live workspace</h3>
          <LiveDot />
        </div>
        {session.role === "client" ? (
          <ClientView />
        ) : session.role === "insurer" ? (
          <InsurerView />
        ) : (
          <ClientsView selected={selected} onSelect={onSelect} />
        )}
      </CardContent>
    </Card>
  );
}

function FrameLabel({ children }: { children: string }) {
  return (
    <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
      {children}
    </p>
  );
}

export function LiveWorkspaceScreen() {
  const state = useAppState();
  const view = lifecycleView(state);
  const [selected, setSelected] = useState<StageNo | null>(null);
  // Clients pick stages to filter; insurers and clients see a fixed live view.
  const filterable = state.session.role === "advisor" || state.session.role === "fsp";

  return (
    <OnDarkContext.Provider value>
      <PageHeader
        title="Live Workspace"
        description="Where every client is in the advice lifecycle, updated live."
      />
      <section
        aria-label="Advice lifecycle"
        className="rounded-lg border border-white/10 bg-navy p-4 text-navy-foreground sm:p-6"
      >
        <div className="mb-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
            The advice lifecycle
          </p>
          <h2 className="mt-1 text-xl font-medium leading-7 sm:text-2xl sm:leading-8">
            From first scan to annual review, in a fixed legal order.
          </h2>
          <p className="mt-1 text-sm text-navy-foreground/65">
            Every step is checked by the compliance engine. Out-of-order actions are refused and
            logged.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
          <div className="rounded-lg border border-white/10 p-4 sm:p-5">
            <FrameLabel>Flow map</FrameLabel>
            <LifecycleFlow
              chips={view.chips}
              active={view.active}
              selected={filterable ? selected : null}
              onSelect={filterable ? setSelected : undefined}
            />
          </div>
          <div className="lg:sticky lg:top-20">
            <FrameLabel>Live workspace</FrameLabel>
            <LiveWorkspacePanel selected={selected} onSelect={setSelected} />
          </div>
        </div>
      </section>
    </OnDarkContext.Provider>
  );
}
