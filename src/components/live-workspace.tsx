import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { ActivityList } from "@/components/dashboards";
import { StageBadge } from "@/components/common";
import { ClientPanel } from "@/components/client-panel";
import { LifecycleFlow } from "@/components/lifecycle-diagram";
import { LiveStats } from "@/components/live-stats";
import { StepsView } from "@/components/steps-view";
import { GateTray } from "@/components/izenzo-canvas";
import { FramedCanvas } from "@/components/izenzo-frames";
import { WorkspaceTaskbar } from "@/components/workspace-taskbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAGES, getStage, isComplete, type StageNo } from "@/lib/domain/gates";
import { lifecycleView } from "@/lib/domain/lifecycle";
import { nextAction } from "@/lib/domain/next-action";
import { useAppState } from "@/lib/domain/store";
import { type CaseRecord } from "@/lib/domain/types";
import { workspaceTabs } from "@/lib/workspace-tabs";
import { cn } from "@/lib/utils";

const inStage = (c: CaseRecord, n: StageNo) => getStage(c) === n && (n === 6 || !isComplete(c));

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
  const rows = mine.filter((c) => (selected ? inStage(c, selected) : true));

  return (
    <>
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
        <div className="mb-4">
          <LiveStats />
        </div>
        {session.role === "insurer" ? (
          <InsurerView />
        ) : (
          <ClientsView selected={selected} onSelect={onSelect} />
        )}
      </CardContent>
    </Card>
  );
}

function FrameLabel({ children, onDark = false }: { children: string; onDark?: boolean }) {
  return (
    <p
      className={`mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.2em] ${onDark ? "text-brand" : "text-brand-ink"}`}
    >
      {children}
    </p>
  );
}

export function LiveWorkspaceScreen() {
  const state = useAppState();
  const view = lifecycleView(state);
  const [selected, setSelected] = useState<StageNo | null>(null);
  const [mode, setMode] = useState<"map" | "steps">("map");
  const search = useSearch({ from: "/workspace" });
  const navigate = useNavigate();
  const role = state.session.role;
  // Clients see their own next step, not the reporting that staff and insurers get.
  const isClient = role === "client";
  // Advisors and FSPs pick a stage to filter the live view.
  const filterable = role === "advisor" || role === "fsp";
  const caseId = isClient ? state.session.clientCaseId : search.case;
  const openCase = state.cases.find((c) => c.id === caseId);

  useEffect(() => {
    if (isClient) return;
    if (search.case) workspaceTabs.open(search.case);
    else if (state.cases[0])
      void navigate({ to: "/workspace", search: { case: state.cases[0].id }, replace: true });
  }, [isClient, search.case, state.cases, navigate]);

  return (
    <div className={cn(!isClient && "pb-16")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="label-caps mr-auto text-muted-foreground">indigro advice workflow</p>
        {!isClient && (
          <Select
            value={search.case ?? ""}
            onValueChange={(v) => void navigate({ to: "/workspace", search: { case: v } })}
          >
            <SelectTrigger className="h-8 w-56 text-xs" aria-label="Open a case">
              <SelectValue placeholder="Open a case in a tab…" />
            </SelectTrigger>
            <SelectContent>
              {state.cases.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} · {c.clientName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {openCase ? (
        <section
          aria-label="Case workflow"
          className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)] lg:items-start"
        >
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{openCase.code}</p>
                <h2 className="text-lg font-medium">{openCase.clientName}</h2>
              </div>
              <div className="flex items-center gap-2">
                <StageBadge c={openCase} />
                <div role="group" aria-label="View" className="flex gap-1">
                  {(["map", "steps"] as const).map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant={mode === m ? "default" : "outline"}
                      aria-pressed={mode === m}
                      onClick={() => setMode(m)}
                      className="h-8 rounded-full capitalize"
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            {mode === "map" ? <FramedCanvas c={openCase} /> : <StepsView c={openCase} />}
          </div>
          <div className="space-y-4 lg:sticky lg:top-32">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="label-caps text-foreground">Live workspace</p>
                <span
                  aria-label="Live workspace ID"
                  className="rounded-full border border-border bg-warning px-3 py-1 font-mono text-xs font-bold text-foreground"
                >
                  LW-{openCase.code}
                </span>
              </div>
              <GateTray c={openCase} />
            </div>
            {isClient ? (
              <ClientPanel />
            ) : (
              <LiveWorkspacePanel selected={selected} onSelect={setSelected} />
            )}
          </div>
        </section>
      ) : mode === "steps" ? (
        <section aria-label="Steps" className="rounded-lg border bg-card p-4 sm:p-6">
          <Empty>Open a case above to follow its steps.</Empty>
        </section>
      ) : (
        <section
          aria-label="Advice lifecycle"
          className="rounded-lg border bg-card p-4 text-card-foreground sm:p-6"
        >
          <div className="mb-6">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand-ink">
              The advice lifecycle
            </p>
            <h2 className="mt-1 text-xl font-medium leading-7 sm:text-2xl sm:leading-8">
              From first scan to annual review, in a fixed legal order.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every step is checked by the compliance engine. Out-of-order actions are refused and
              logged.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
            <div className="rounded-lg border bg-card p-4 text-card-foreground sm:p-5">
              <FrameLabel>Flow map</FrameLabel>
              <LifecycleFlow
                chips={view.chips}
                active={view.active}
                rowsDone={view.activeRowsDone}
                complete={view.complete}
                selected={filterable ? selected : null}
                onSelect={filterable ? setSelected : undefined}
              />
            </div>
            <div className="lg:sticky lg:top-32">
              <FrameLabel>{isClient ? "Your next step" : "Live workspace"}</FrameLabel>
              {isClient ? (
                <ClientPanel />
              ) : (
                <LiveWorkspacePanel selected={selected} onSelect={setSelected} />
              )}
            </div>
          </div>
        </section>
      )}
      {!isClient && <WorkspaceTaskbar />}
    </div>
  );
}
