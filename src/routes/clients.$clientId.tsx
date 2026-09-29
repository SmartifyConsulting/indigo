import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";

import { FnaTab } from "@/components/case/fna-tab";
import { IssuanceTab } from "@/components/case/issuance-tab";
import { OnboardingTab } from "@/components/case/onboarding-tab";
import { PortfolioTab } from "@/components/case/portfolio-tab";
import { PresentTab } from "@/components/case/present-tab";
import { QuotesTab } from "@/components/case/quotes-tab";
import { EmptyState, PageHeader, RequireRole, StageBadge, VerifiedBadge } from "@/components/common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGES, getStage, isComplete } from "@/lib/domain/gates";
import { nextAction } from "@/lib/domain/next-action";
import { useAppState } from "@/lib/domain/store";
import { fmtDate } from "@/lib/fmt";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clients/$clientId")({
  head: () => ({ meta: [{ title: "Client workspace | indigro" }] }),
  component: CaseWorkspace,
});

function CaseWorkspace() {
  return (
    <RequireRole roles={["advisor", "fsp"]}>
      <Workspace />
    </RequireRole>
  );
}

function Workspace() {
  const { clientId } = Route.useParams();
  const s = useAppState();
  const c = s.cases.find((x) => x.id === clientId);
  const stage = c ? getStage(c) : 1;
  // Open on the current stage once, then stay put as the case advances so results stay visible.
  const [initialStage] = useState(stage);
  const [tab, setTab] = useState<string | null>(null);

  if (!c) {
    return (
      <EmptyState title="Client not found">
        <Link to="/clients" className="text-primary hover:underline">
          Back to clients
        </Link>
      </EmptyState>
    );
  }

  const active = tab ?? `s${initialStage}`;
  const advisor = s.advisors.find((a) => a.id === c.advisorId);
  const next = nextAction(c);
  const readOnly = s.session.role === "fsp";
  const complete = isComplete(c);

  return (
    <>
      <PageHeader
        back={{ to: "/clients", label: "All clients" }}
        title={c.clientName}
        description={
          <>
            {advisor?.name} · Invited {fmtDate(c.createdAt)} · Ref {c.code}
          </>
        }
        actions={
          <>
            <VerifiedBadge c={c} />
            <StageBadge c={c} />
          </>
        }
      />

      <div className="mb-6 rounded-lg border bg-card p-4">
        <ol className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {STAGES.map((st) => {
            const done = complete || st.no < stage;
            const current = !complete && st.no === stage;
            return (
              <li key={st.no}>
                <button
                  onClick={() => setTab(`s${st.no}`)}
                  className={cn(
                    "flex w-full flex-col gap-1.5 text-left",
                    active === `s${st.no}` && "opacity-100",
                  )}
                >
                  <span
                    className={cn(
                      "h-1 rounded-sm",
                      done ? "bg-positive" : current ? "bg-primary" : "bg-border",
                    )}
                  />
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    {done ? (
                      <Check className="h-3.5 w-3.5 text-positive" />
                    ) : (
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                          current
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {st.no}
                      </span>
                    )}
                    <span className={current ? "text-foreground" : "text-muted-foreground"}>
                      {st.short}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 border-t pt-3 text-sm">
          <span className="text-muted-foreground">Next: </span>
          <span className="font-medium">{next.text}</span>
          {next.owner !== "none" && (
            <span className="text-muted-foreground">
              {" "}
              ({next.owner === "fsp" ? "Key Individual" : next.owner})
            </span>
          )}
        </p>
      </div>

      {readOnly && (
        <div className="mb-6 rounded-lg border bg-primary-soft p-3 text-sm text-primary">
          Supervision view: you can inspect everything here. Actions are performed by the advisor
          and the client.
        </div>
      )}

      <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
        <Tabs value={active} onValueChange={setTab}>
          <TabsList>
            {STAGES.map((st) => (
              <TabsTrigger key={st.no} value={`s${st.no}`}>
                {st.no}. {st.short}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="s1">
            <OnboardingTab c={c} />
          </TabsContent>
          <TabsContent value="s2">
            <PortfolioTab c={c} />
          </TabsContent>
          <TabsContent value="s3">
            <FnaTab c={c} />
          </TabsContent>
          <TabsContent value="s4">
            <QuotesTab c={c} />
          </TabsContent>
          <TabsContent value="s5">
            <PresentTab c={c} />
          </TabsContent>
          <TabsContent value="s6">
            <IssuanceTab c={c} />
          </TabsContent>
        </Tabs>
      </fieldset>
    </>
  );
}
