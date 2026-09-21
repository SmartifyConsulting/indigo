import { Link } from "@tanstack/react-router";
import { ScanFace } from "lucide-react";
import { useState } from "react";

import { StageBadge } from "@/components/common";
import { IdentityWizard } from "@/components/identity-wizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STAGES, getStage, isComplete } from "@/lib/domain/gates";
import { nextAction } from "@/lib/domain/next-action";
import { useAppState } from "@/lib/domain/store";
import { cn } from "@/lib/utils";

/**
 * The client's right-hand frame on Live Workspace: where they are, what is next, and the button
 * to do it. It shows none of the staff reporting. Green is done, teal is where they are, grey is
 * still to come.
 */
export function ClientPanel() {
  const s = useAppState();
  const c = s.cases.find((x) => x.id === s.session.clientCaseId) ?? s.cases[0];
  const [wizardOpen, setWizardOpen] = useState(false);

  if (!c) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">No client selected.</CardContent>
      </Card>
    );
  }

  const stage = getStage(c);
  const complete = isComplete(c);
  const next = nextAction(c);
  // The next thing is the ID and liveness check: after arriving by QR or link, before screening.
  const needsIdCheck =
    stage === 1 && !c.identity.livenessVerified && c.identity.sanctions !== "hit";

  return (
    <Card className="[--primary-foreground:var(--brand-foreground)] [--primary:var(--brand)] [--ring:var(--brand)]">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
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

        <div
          className="mt-4 flex gap-1.5"
          role="img"
          aria-label={complete ? "All steps done" : `Step ${stage} of 6`}
        >
          {STAGES.map((st) => (
            <span
              key={st.no}
              className={cn(
                "h-1.5 flex-1 rounded-sm",
                complete || st.no < stage
                  ? "bg-positive"
                  : st.no === stage
                    ? "bg-brand"
                    : "bg-border",
              )}
            />
          ))}
        </div>

        {wizardOpen ? (
          <div className="mt-4 rounded-md border p-4">
            <IdentityWizard c={c} onClose={() => setWizardOpen(false)} />
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-background p-4">
            <div>
              <p className="text-xs text-muted-foreground">Next step</p>
              <p className="text-sm font-medium">
                {needsIdCheck
                  ? "Verify your identity with your ID and a quick liveness check"
                  : next.text}
              </p>
            </div>
            {needsIdCheck ? (
              <Button onClick={() => setWizardOpen(true)}>
                <ScanFace /> Verify my identity
              </Button>
            ) : stage === 1 && next.owner === "client" ? (
              <Button asChild>
                <Link to="/onboard/$code" params={{ code: c.code }}>
                  Continue onboarding
                </Link>
              </Button>
            ) : next.owner === "client" ? (
              <Button asChild>
                <Link to="/actions">Go to actions</Link>
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
