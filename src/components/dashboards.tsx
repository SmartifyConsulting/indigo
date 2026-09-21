import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { LEDGER_TONE } from "@/components/case/issuance-tab";
import { PageHeader, StageBadge, StatCard } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGES, getStage, isComplete, roaSigned } from "@/lib/domain/gates";
import { nextAction } from "@/lib/domain/next-action";
import { useAppState } from "@/lib/domain/store";
import { PROVIDERS, providerName, type AppState, type CaseRecord } from "@/lib/domain/types";
import { fmtDate, fmtDateTime, zar } from "@/lib/fmt";

function StageChart({ cases }: { cases: CaseRecord[] }) {
  const data = STAGES.map((st) => ({
    name: String(st.no),
    full: `Stage ${st.no}: ${st.short}`,
    clients: cases.filter((c) => !isComplete(c) && getStage(c) === st.no).length,
  })).concat([{ name: "✓", full: "Complete", clients: cases.filter(isComplete).length }]);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          stroke="var(--color-muted-foreground)"
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          stroke="var(--color-muted-foreground)"
        />
        <Tooltip
          cursor={{ fill: "var(--color-accent)" }}
          contentStyle={{
            borderRadius: 6,
            border: "1px solid var(--color-border)",
            background: "var(--color-card)",
            color: "var(--color-foreground)",
            fontSize: 12,
          }}
          labelFormatter={(_, p) => (p?.[0]?.payload as { full?: string } | undefined)?.full ?? ""}
        />
        <Bar dataKey="clients" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ActivityList({
  s,
  caseIds,
  limit = 6,
}: {
  s: AppState;
  caseIds?: Set<string>;
  limit?: number;
}) {
  const events = [...s.ledger]
    .reverse()
    .filter((e) => !caseIds || (e.caseId && caseIds.has(e.caseId)))
    .slice(0, limit);
  return (
    <ul className="divide-y text-sm">
      {events.map((e) => (
        <li key={e.seq} className="flex items-start gap-3 py-2.5">
          <Badge variant={LEDGER_TONE[e.type] ?? "secondary"} className="mt-0.5 shrink-0">
            {e.type.replace(/_/g, " ").toLowerCase()}
          </Badge>
          <span className="min-w-0">
            {e.summary}
            <span className="block text-xs text-muted-foreground">
              {e.actor.name} · {fmtDateTime(e.ts)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- Advisor */

export function AdvisorDashboard() {
  const s = useAppState();
  const me = s.advisors[0]!;
  const mine = s.cases.filter((c) => c.advisorId === me.id);
  const ids = new Set(mine.map((c) => c.id));
  const attention = mine
    .filter((c) => !isComplete(c))
    .map((c) => ({ c, n: nextAction(c) }))
    .filter((x) => x.n.owner === "advisor" || x.n.owner === "fsp");

  return (
    <>
      <PageHeader
        title={`Good day, ${me.name.split(" ")[0]}`}
        description={`${s.fsp.name} · ${me.fsNumber}`}
        actions={
          <Button asChild>
            <Link to="/clients">View all clients</Link>
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Needs your action</CardTitle>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is waiting on you.</p>
            ) : (
              <ul className="divide-y">
                {attention.map(({ c, n }) => (
                  <li key={c.id}>
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: c.id }}
                      className="flex items-center justify-between gap-3 py-3 hover:text-primary"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{c.clientName}</p>
                        <p className="text-xs text-muted-foreground">{n.text}</p>
                      </div>
                      <span className="flex items-center gap-3">
                        <StageBadge c={c} />
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by stage</CardTitle>
          </CardHeader>
          <CardContent>
            <StageChart cases={mine} />
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityList s={s} caseIds={ids} />
        </CardContent>
      </Card>
    </>
  );
}

/* ----------------------------------------------------------------- Client */

export function ClientDashboard() {
  const s = useAppState();
  const c = s.cases.find((x) => x.id === s.session.clientCaseId) ?? s.cases[0]!;
  const na = nextAction(c);
  const advisor = s.advisors.find((a) => a.id === c.advisorId);
  const issued = c.applications.filter((a) => a.status === "issued");
  const stage = getStage(c);
  const complete = isComplete(c);
  const needsOnboarding = stage === 1;

  return (
    <>
      <PageHeader
        title={`Welcome, ${c.clientName.split(" ")[0]}`}
        description={`Your advisor is ${advisor?.name} at ${s.fsp.name}`}
      />
      <Card className="mb-6">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Where you are
              </p>
              <p className="title-lg mt-1">
                {complete
                  ? "Your cover is in place"
                  : `Step ${stage} of 6: ${STAGES[stage - 1]!.title}`}
              </p>
            </div>
            <StageBadge c={c} />
          </div>
          <div className="flex gap-1.5">
            {STAGES.map((st) => (
              <span
                key={st.no}
                className={`h-1.5 flex-1 rounded-sm ${complete || st.no < stage ? "bg-positive" : st.no === stage ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-background p-4">
            <div>
              <p className="text-xs text-muted-foreground">Next step</p>
              <p className="text-sm font-medium">{na.text}</p>
            </div>
            {needsOnboarding ? (
              <Button asChild>
                <Link to="/onboard/$code" params={{ code: c.code }}>
                  Continue onboarding
                </Link>
              </Button>
            ) : na.owner === "client" ? (
              <Button asChild>
                <Link to="/actions">Go to actions</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Policies in force"
          value={issued.length}
          hint={issued.length ? "Issued through your advisor" : "None issued yet"}
        />
        <StatCard
          label="Existing products found"
          value={
            c.astute.fetchedAt && !(c.astute.alert && !c.astute.alert.resolvedAt)
              ? c.astute.policies.length
              : "—"
          }
          hint="Retrieved with your consent"
        />
        <StatCard
          label="Next annual review"
          value={c.annualReviewDue ? fmtDate(c.annualReviewDue) : "—"}
          hint="Scheduled after issue"
        />
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Everything you sign is time-stamped and locked in an audit record that cannot be edited.{" "}
        {roaSigned(c) ? "Your Record of Advice is signed." : ""}
      </p>
    </>
  );
}

/* -------------------------------------------------------------------- FSP */

export function FspDashboard() {
  const s = useAppState();
  const blocked = s.ledger.filter((e) => e.type === "GATE_BLOCKED");
  const escalations = s.cases.filter((c) => c.identity.sanctions === "hit");
  const alerts = s.cases.filter((c) => c.astute.alert && !c.astute.alert.resolvedAt);
  const active = s.cases.filter((c) => !isComplete(c));

  return (
    <>
      <PageHeader
        title="Compliance overview"
        description={`${s.fsp.name} · ${s.fsp.fspNumber} · Key Individual: ${s.fsp.keyIndividual}`}
        actions={
          <Button asChild>
            <Link to="/compliance">Open compliance console</Link>
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Advisor supervision</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {s.advisors.map((a) => {
                const theirs = s.cases.filter((c) => c.advisorId === a.id);
                const ids = new Set(theirs.map((c) => c.id));
                const b = blocked.filter((e) => e.caseId && ids.has(e.caseId)).length;
                return (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {a.name} {!a.active && <Badge variant="secondary">Inactive</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.title} · {a.fsNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{theirs.filter((c) => !isComplete(c)).length} active</span>
                      <Badge variant={b ? "warning" : "success"}>{b} blocked</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by stage</CardTitle>
          </CardHeader>
          <CardContent>
            <StageChart cases={s.cases} />
            <p className="mt-2 text-xs text-muted-foreground">
              {active.length} active cases across all advisors.
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Latest ledger activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityList s={s} />
        </CardContent>
      </Card>
    </>
  );
}

/* ---------------------------------------------------------------- Insurer */

export function InsurerDashboard() {
  const s = useAppState();
  const me = s.session.insurerId;
  const apps = s.cases.flatMap((c) =>
    c.applications.filter((a) => a.providerId === me).map((a) => ({ c, a })),
  );
  const pending = apps.filter((x) => x.a.status === "submitted");
  const issued = apps.filter((x) => x.a.status === "issued");
  const medical = pending.filter((x) => x.a.needsMedical && !x.c.execution.medicalCompletedAt);
  const line = PROVIDERS.find((p) => p.id === me)?.line;

  return (
    <>
      <PageHeader
        title={`${providerName(me)} underwriting desk`}
        description="Applications reach you only after the intermediary's compliance gates are met, so every file arrives with signed disclosures, mandates and a current Record of Advice."
        actions={
          <Button asChild>
            <Link to="/applications">Open applications</Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Compliance evidence on every file</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {[
            "Liveness-verified identity and L0 screening",
            "Signed advisor disclosure and Letter of Authority",
            "Current-version Record of Advice signed by the client",
            "Debit order mandate and life declaration e-signatures",
            "Immutable, hash-chained audit trail per case",
          ].map((t) => (
            <p key={t}>✓ {t}</p>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
