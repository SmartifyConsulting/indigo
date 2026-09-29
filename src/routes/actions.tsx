import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, HeartPulse, Lock } from "lucide-react";
import { useState } from "react";

import { FICA_DOCS, FicaRow } from "@/components/case/present-tab";
import { EmptyState, PageHeader, RequireRole, toastResult } from "@/components/common";
import { SignButton } from "@/components/sign-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { astuteLocked, hasSig, latestRoa, roaSigned, sigCurrent } from "@/lib/domain/gates";
import { actions, useAppState } from "@/lib/domain/store";
import type { CaseRecord } from "@/lib/domain/types";
import { fmtDateTime } from "@/lib/fmt";

export const Route = createFileRoute("/actions")({
  head: () => ({ meta: [{ title: "Actions & signatures | indigro" }] }),
  component: () => (
    <RequireRole roles={["client"]}>
      <Actions />
    </RequireRole>
  ),
});

const CONDITIONS = [
  "High blood pressure",
  "Diabetes",
  "Heart condition",
  "Asthma or lung condition",
  "Cancer (current or past)",
  "Mental health treatment",
];

/** Answers live only in this component's state: they are submitted to the insurer, never persisted by the platform. */
function MedicalDialog({
  c,
  open,
  onOpenChange,
}: {
  c: CaseRecord;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Health disclosure</DialogTitle>
          <DialogDescription>
            Encrypted end to end. Your answers go straight to the insurer's underwriters. Your
            advisor cannot see them.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            Height (cm)
            <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            Weight (kg)
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Have you ever been diagnosed with or treated for:
          </p>
          {CONDITIONS.map((cond) => (
            <label key={cond} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={checked.includes(cond)}
                onCheckedChange={(v) =>
                  setChecked((p) => (v ? [...p, cond] : p.filter((x) => x !== cond)))
                }
              />
              {cond}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (toastResult(actions.completeMedical(c.id), "Health disclosure sent securely"))
                onOpenChange(false);
            }}
          >
            Submit securely
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Task({
  title,
  detail,
  done,
  children,
}: {
  title: string;
  detail?: string;
  done: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? "bg-positive text-white" : "border-2 border-input"}`}
        >
          {done && <Check className="h-3 w-3" />}
        </span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Actions() {
  const s = useAppState();
  const c = s.cases.find((x) => x.id === s.session.clientCaseId);
  const [med, setMed] = useState(false);
  if (!c) return <EmptyState title="No client selected" />;

  const roa = latestRoa(c);
  const locked = astuteLocked(c);
  const onboarded = c.identity.livenessVerified && hasSig(c, "disclosure") && hasSig(c, "loa");
  const wantsMedical =
    c.applications.some((a) => a.needsMedical) && c.execution.underwritingMode !== "tele";

  return (
    <>
      <PageHeader
        title="Actions & Signatures"
        description="Everything that needs you, in the order it's needed."
      />
      <Card className="mb-6">
        <CardContent className="divide-y p-0">
          <Task
            title="Verify your identity and sign your mandates"
            detail={onboarded ? "Complete" : "Takes about three minutes"}
            done={onboarded}
          >
            {!onboarded && (
              <Button size="sm" asChild>
                <Link to="/onboard/$code" params={{ code: c.code }}>
                  Continue
                </Link>
              </Button>
            )}
          </Task>
          {c.astute.alert && (
            <Task
              title="Confirm your authority (updated mandate)"
              detail="Another provider queried your policy data. Signing unlocks your portfolio."
              done={!locked}
            >
              {locked && <SignButton caseId={c.id} kind="mandate" />}
            </Task>
          )}
          {c.fnaMode === "single-need" && (
            <Task title="Single-need disclaimer" done={hasSig(c, "single-need")}>
              {!hasSig(c, "single-need") && onboarded && (
                <SignButton caseId={c.id} kind="single-need" />
              )}
            </Task>
          )}
          {roa && (
            <>
              <Task
                title={`Record of Advice v${roa.version}`}
                detail={
                  roaSigned(c)
                    ? "Signed"
                    : `${roa.content.recommendations.length} recommended products, R ${roa.content.totalMonthlyPremium.toLocaleString("en-US").replace(/,/g, " ")} a month`
                }
                done={roaSigned(c)}
              >
                {!roaSigned(c) && <SignButton caseId={c.id} kind="roa" label="Review and sign" />}
              </Task>
              <Task title="Debit order mandate" done={sigCurrent(c, "debit-order")}>
                {!sigCurrent(c, "debit-order") && (
                  <SignButton caseId={c.id} kind="debit-order" disabled={!roaSigned(c)} />
                )}
              </Task>
              {c.quotes.items.some(
                (q) =>
                  c.quotes.selectedIds.includes(q.id) &&
                  ["life", "disability", "severe-illness"].includes(q.needId),
              ) && (
                <Task title="Life declaration" done={sigCurrent(c, "life-declaration")}>
                  {!sigCurrent(c, "life-declaration") && (
                    <SignButton caseId={c.id} kind="life-declaration" disabled={!roaSigned(c)} />
                  )}
                </Task>
              )}
            </>
          )}
          {wantsMedical && (
            <Task
              title="Health disclosure"
              detail={
                c.execution.medicalCompletedAt
                  ? `Sent ${fmtDateTime(c.execution.medicalCompletedAt)}`
                  : c.execution.underwritingLinkSentAt
                    ? "Required by the insurer"
                    : "Available after your application is submitted"
              }
              done={!!c.execution.medicalCompletedAt}
            >
              {!c.execution.medicalCompletedAt && (
                <Button
                  size="sm"
                  onClick={() => setMed(true)}
                  disabled={!c.execution.underwritingLinkSentAt}
                >
                  {c.execution.underwritingLinkSentAt ? <HeartPulse /> : <Lock />} Complete securely
                </Button>
              )}
            </Task>
          )}
          {c.review.renewalIssuedAt && (
            <Task
              title="Annual review: renewal schedule"
              detail="Review the schedule and any changes to your cover"
              done={!!c.review.acknowledgedAt}
            >
              {!c.review.acknowledgedAt && (
                <Button
                  size="sm"
                  onClick={() =>
                    toastResult(
                      actions.acknowledgeReview(c.id),
                      "Thank you. Your acknowledgement is recorded",
                    )
                  }
                >
                  Acknowledge
                </Button>
              )}
            </Task>
          )}
        </CardContent>
      </Card>

      {roa && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Documents to upload</CardTitle>
            {c.fica.bankValidatedAt ? (
              <Badge variant="success">Verified</Badge>
            ) : (
              <Badge variant="secondary">Your advisor verifies these</Badge>
            )}
          </CardHeader>
          <CardContent className="divide-y rounded-md border p-0">
            {FICA_DOCS.map((d) => (
              <FicaRow key={d.key} c={c} docKey={d.key} label={d.label} />
            ))}
          </CardContent>
        </Card>
      )}
      <MedicalDialog c={c} open={med} onOpenChange={setMed} />
    </>
  );
}
