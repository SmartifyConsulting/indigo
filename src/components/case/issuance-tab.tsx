import { CalendarClock, RefreshCw } from "lucide-react";
import { useState } from "react";

import { EmptyState, Field, toastResult } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { actions, useAppState } from "@/lib/domain/store";
import { providerName, type CaseRecord, type LedgerType } from "@/lib/domain/types";
import { fmtDate, fmtDateTime } from "@/lib/fmt";

const STATUS = { submitted: "warning", issued: "success", declined: "danger" } as const;

export const LEDGER_TONE: Partial<Record<LedgerType, "danger" | "success" | "warning" | "info">> = {
  GATE_BLOCKED: "danger",
  POLICY_ISSUED: "success",
  APPLICATION_DECLINED: "danger",
  ASTUTE_ALERT: "warning",
  DOCUMENT_SIGNED: "info",
};

export function CaseAuditTrail({ caseId }: { caseId: string }) {
  const s = useAppState();
  const events = s.ledger.filter((e) => e.caseId === caseId).reverse();
  return (
    <ul className="divide-y text-sm">
      {events.map((e) => (
        <li key={e.seq} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5">
          <Badge variant={LEDGER_TONE[e.type] ?? "secondary"} className="shrink-0">
            {e.type.replace(/_/g, " ").toLowerCase()}
          </Badge>
          <span className="min-w-0 flex-1">
            {e.summary}
            <span className="block text-xs text-muted-foreground">
              {e.actor.name} · {fmtDateTime(e.ts)} · #{e.seq} · {e.hash.slice(0, 10)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function IssuanceTab({ c }: { c: CaseRecord }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Applications and policy issuance</CardTitle>
          </CardHeader>
          <CardContent>
            {c.applications.length === 0 ? (
              <EmptyState title="Nothing submitted yet">
                Submit the application from the Presentation tab once the checklist is complete.
              </EmptyState>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insurer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Policy number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.applications.map((a) => (
                    <TableRow key={a.quoteId}>
                      <TableCell className="font-medium">{providerName(a.providerId)}</TableCell>
                      <TableCell>
                        {a.product}
                        {a.needsMedical && (
                          <span className="block text-xs text-muted-foreground">
                            Medical underwriting{" "}
                            {c.execution.medicalCompletedAt ? "complete" : "outstanding"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS[a.status]} className="capitalize">
                          {a.status === "submitted" ? "With insurer" : a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.policyNumber ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {c.annualReviewDue && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> Annual review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Review scheduled for <strong>{fmtDate(c.annualReviewDue)}</strong>. At the
                anniversary the client receives their renewal schedule and change disclosures, and
                their acknowledgement is logged in the vault.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toastResult(actions.issueRenewal(c.id), "Renewal schedule issued to the client")
                  }
                >
                  <RefreshCw />{" "}
                  {c.review.renewalIssuedAt
                    ? "Re-issue renewal schedule"
                    : "Issue renewal schedule now"}
                </Button>
                {c.review.renewalIssuedAt && (
                  <Badge variant={c.review.acknowledgedAt ? "success" : "warning"}>
                    {c.review.acknowledgedAt
                      ? `Acknowledged ${fmtDateTime(c.review.acknowledgedAt)}`
                      : `Issued ${fmtDateTime(c.review.renewalIssuedAt)}, awaiting acknowledgement`}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Audit trail (WORM ledger)</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseAuditTrail caseId={c.id} />
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Record a meeting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Annual review call"
            />
          </Field>
          <Field label="Notes">
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (
                toastResult(
                  actions.recordMeeting(c.id, title, notes),
                  "Meeting logged to the audit ledger",
                )
              ) {
                setTitle("");
                setNotes("");
              }
            }}
          >
            Log meeting
          </Button>
          {c.meetings.length > 0 && (
            <ul className="divide-y border-t pt-2 text-sm">
              {c.meetings.map((m) => (
                <li key={m.id} className="py-2">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(m.ts)}</p>
                  {m.notes && <p className="mt-1 text-xs">{m.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
