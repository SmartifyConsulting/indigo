import { createFileRoute } from "@tanstack/react-router";

import { NeedsTable } from "@/components/case/fna-tab";
import { PortfolioTable } from "@/components/case/portfolio-tab";
import { EmptyState, LockedBanner, PageHeader, RequireRole, StatCard } from "@/components/common";
import { SignButton } from "@/components/sign-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { astuteLocked } from "@/lib/domain/gates";
import { useAppState } from "@/lib/domain/store";
import { providerName } from "@/lib/domain/types";
import { fmtDate, zar } from "@/lib/fmt";

export const Route = createFileRoute("/portfolios")({
  head: () => ({ meta: [{ title: "My wealth & protection | indigro" }] }),
  component: () => (
    <RequireRole roles={["client"]}>
      <Portfolio />
    </RequireRole>
  ),
});

function Portfolio() {
  const s = useAppState();
  const c = s.cases.find((x) => x.id === s.session.clientCaseId);
  if (!c) return <EmptyState title="No client selected" />;
  const locked = astuteLocked(c);
  const issued = c.applications.filter((a) => a.status === "issued");
  const existingTotal = c.astute.policies.reduce((sum, p) => sum + p.monthlyPremium, 0);
  const newTotal = issued.reduce(
    (sum, a) => sum + (c.quotes.items.find((q) => q.id === a.quoteId)?.monthlyPremium ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="My wealth & protection"
        description="Your existing products and new cover, in one place."
      />
      {locked && (
        <div className="mb-6">
          <LockedBanner>
            <p className="font-medium">Your portfolio data is locked</p>
            <p className="mt-0.5">
              Another financial services provider queried your policy information. Please confirm
              your authority by signing an updated mandate to unlock it.
            </p>
            <div className="mt-3">
              <SignButton caseId={c.id} kind="mandate" label="Sign updated mandate" />
            </div>
          </LockedBanner>
        </div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Existing products"
          value={c.astute.fetchedAt ? (locked ? "Locked" : c.astute.policies.length) : "—"}
        />
        <StatCard
          label="Existing monthly premiums"
          value={c.astute.fetchedAt && !locked ? zar(existingTotal) : "—"}
        />
        <StatCard
          label="New cover via your advisor"
          value={issued.length ? zar(newTotal) + " p/m" : "—"}
          hint={`${issued.length} policies issued`}
        />
      </div>

      {c.astute.fetchedAt && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Existing products</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioTable c={c} locked={locked} />
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Policies issued through your advisor</CardTitle>
        </CardHeader>
        <CardContent>
          {c.applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing issued yet. New policies appear here once the insurer accepts your
              application.
            </p>
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
                    <TableCell>{a.product}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.status === "issued"
                            ? "success"
                            : a.status === "declined"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {a.status === "submitted" ? "With insurer" : a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.policyNumber ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {c.annualReviewDue && (
            <p className="mt-3 text-sm text-muted-foreground">
              Your next annual review is on {fmtDate(c.annualReviewDue)}.
            </p>
          )}
        </CardContent>
      </Card>

      {c.fna.result && (
        <Card>
          <CardHeader>
            <CardTitle>Your protection gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <NeedsTable needs={c.fna.result.needs} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
