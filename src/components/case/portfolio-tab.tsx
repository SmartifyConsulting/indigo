import { Database, Lock } from "lucide-react";

import { GateList, LockedBanner, toastResult } from "@/components/common";
import { SignButton } from "@/components/sign-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adviceGates, astuteLocked } from "@/lib/domain/gates";
import { actions, useAppState } from "@/lib/domain/store";
import type { CaseRecord } from "@/lib/domain/types";
import { fmtDateTime, zar } from "@/lib/fmt";

export function PortfolioTable({ c, locked }: { c: CaseRecord; locked: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Provider</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead className="text-right">Cover / value</TableHead>
          <TableHead className="text-right">Monthly</TableHead>
          <TableHead className="text-right">Claims (36m)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {c.astute.policies.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{locked ? "••••••" : p.provider}</TableCell>
            <TableCell>{p.type}</TableCell>
            <TableCell className="text-muted-foreground">
              {locked ? "••••-•••••••" : p.reference}
            </TableCell>
            <TableCell className="text-right">{locked ? "R ••• •••" : zar(p.value)}</TableCell>
            <TableCell className="text-right">{locked ? "R •••" : zar(p.monthlyPremium)}</TableCell>
            <TableCell className="text-right">
              {p.claims === undefined ? "n/a" : locked ? "•" : p.claims}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function PortfolioTab({ c }: { c: CaseRecord }) {
  const s = useAppState();
  const gates = adviceGates(c);
  const locked = astuteLocked(c);
  const log = s.crmLog.filter((l) => l.caseId === c.id);
  const total = c.astute.policies.reduce((sum, p) => sum + p.monthlyPremium, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {locked && c.astute.alert && (
          <LockedBanner>
            <p className="font-medium">
              Astute cross-alert: {c.astute.alert.brokerage} queried this client
            </p>
            <p className="mt-0.5">
              Detected {fmtDateTime(c.astute.alert.detectedAt)}. An information alert is logged and
              the portfolio below stays locked until the client signs an updated authority mandate.
              Onboarding is not stalled.
            </p>
            <div className="mt-3">
              <SignButton caseId={c.id} kind="mandate" label="Client signs updated mandate" />
            </div>
          </LockedBanner>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Existing portfolio</CardTitle>
            {c.astute.fetchedAt ? (
              <Badge variant={locked ? "warning" : "success"}>
                {locked ? <Lock className="h-3 w-3" /> : null} Retrieved{" "}
                {fmtDateTime(c.astute.fetchedAt)}
              </Badge>
            ) : (
              <Button
                onClick={() =>
                  toastResult(actions.runAstute(c.id), "Portfolio retrieved from Astute")
                }
              >
                <Database /> Pull from Astute Exchange
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {c.astute.fetchedAt ? (
              <>
                <PortfolioTable c={c} locked={locked} />
                {!locked && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {c.astute.policies.length} products, {zar(total)} a month in existing premiums
                    and contributions. Life, disability and investment data came from Astute;
                    short-term schedules and claims history came direct from the insurers.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No data retrieved yet. The pull runs under the signed Letter of Authority and
                returns life, disability and investment products from South African providers.
              </p>
            )}
          </CardContent>
        </Card>

        {log.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>CRM sync</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {log.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {l.object}{" "}
                      <span className="text-muted-foreground">{l.action.toLowerCase()} to</span>{" "}
                      {l.crm === "salesforce" ? "Salesforce" : "HubSpot"}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtDateTime(l.ts)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
      <Card className="h-fit">
        <CardContent className="p-5">
          <GateList gates={gates} title="Required before the pull" />
        </CardContent>
      </Card>
    </div>
  );
}
