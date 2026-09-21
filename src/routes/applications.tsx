import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";

import { EmptyState, PageHeader, RequireRole, toastResult } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { latestRoa } from "@/lib/domain/gates";
import { actions, useAppState } from "@/lib/domain/store";
import { providerName } from "@/lib/domain/types";
import { fmtDateTime, zar } from "@/lib/fmt";

export const Route = createFileRoute("/applications")({
  head: () => ({ meta: [{ title: "Applications | indigro" }] }),
  component: () => (
    <RequireRole roles={["insurer"]}>
      <Applications />
    </RequireRole>
  ),
});

const STATUS = { submitted: "warning", issued: "success", declined: "danger" } as const;

function Applications() {
  const s = useAppState();
  const me = s.session.insurerId;
  const rows = s.cases
    .flatMap((c) => c.applications.filter((a) => a.providerId === me).map((a) => ({ c, a })))
    .sort((x, y) => (x.a.status === "submitted" ? -1 : 1) - (y.a.status === "submitted" ? -1 : 1));

  return (
    <>
      <PageHeader
        title="Applications"
        description={`Submitted to ${providerName(me)} through intermediaries. Each file has passed the platform's compliance gates.`}
      />
      {rows.length === 0 ? (
        <EmptyState title="No applications yet">
          Applications appear here once an advisor submits a compliant file.
        </EmptyState>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Cover and premium</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ c, a }) => {
                  const q = c.quotes.items.find((x) => x.id === a.quoteId);
                  const roa = latestRoa(c);
                  const medOutstanding = a.needsMedical && !c.execution.medicalCompletedAt;
                  return (
                    <TableRow key={a.quoteId}>
                      <TableCell>
                        <p className="font-medium">{c.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Age {c.age} · Submitted {fmtDateTime(a.submittedAt)}
                        </p>
                      </TableCell>
                      <TableCell>{a.product}</TableCell>
                      <TableCell>
                        {q && (
                          <>
                            {zar(q.cover)}
                            <span className="block text-xs text-muted-foreground">
                              {zar(q.monthlyPremium)} p/m
                            </span>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        ROA v{roa?.version} signed
                        <br />
                        {a.needsMedical ? (
                          medOutstanding ? (
                            <span className="text-warning">Medical outstanding</span>
                          ) : (
                            "Medical complete"
                          )
                        ) : (
                          "No medical needed"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS[a.status]} className="capitalize">
                          {a.status}
                        </Badge>
                        {a.policyNumber && (
                          <span className="block text-xs text-muted-foreground">
                            {a.policyNumber}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.status === "submitted" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                toastResult(
                                  actions.decide(c.id, a.quoteId, "issue"),
                                  "Policy issued and schedule sent to the client",
                                )
                              }
                            >
                              <Check /> Accept and issue
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                toastResult(
                                  actions.decide(c.id, a.quoteId, "decline"),
                                  "Application declined",
                                )
                              }
                            >
                              <X /> Decline
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {a.decidedAt && fmtDateTime(a.decidedAt)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
