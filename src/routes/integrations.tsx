import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

import { PageHeader, RequireRole, toastResult } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { actions, useAppState } from "@/lib/domain/store";
import { PROVIDERS } from "@/lib/domain/types";
import { fmtDateTime } from "@/lib/fmt";

export const Route = createFileRoute("/integrations")({
  head: () => ({ meta: [{ title: "Integrations | indigro" }] }),
  component: () => (
    <RequireRole roles={["advisor", "fsp"]}>
      <Integrations />
    </RequireRole>
  ),
});

const TARGET = {
  astute: "Astute Exchange",
  insurer: "Insurer API",
  didit: "DIDIT identity",
  crm: "CRM",
} as const;

function Integrations() {
  const s = useAppState();
  const failed = s.queue.filter((q) => q.status === "failed");

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Two-way CRM sync, Astute portfolio retrieval, insurer quoting APIs and identity verification."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {s.crm.map((crm) => (
          <Card key={crm.id}>
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="font-medium">{crm.name}</p>
                <p className="text-xs text-muted-foreground">{crm.detail}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {crm.connected
                    ? crm.lastSyncAt
                      ? `Last sync ${fmtDateTime(crm.lastSyncAt)}`
                      : "Connected, no syncs yet"
                    : "Not connected"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={crm.connected ? "success" : "secondary"}>
                  {crm.connected ? "Connected" : "Off"}
                </Badge>
                <Switch
                  checked={crm.connected}
                  onCheckedChange={(v) => actions.setCrm(crm.id, v)}
                  aria-label={`Connect ${crm.name}`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Data services</CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            {[
              [
                "Astute Financial Services Exchange",
                "Life, disability and investment portfolios; cross-alerting",
              ],
              ["DIDIT identity verification", "Liveness, Home Affairs ID match, AML/PEP screening"],
            ].map(([n, d]) => (
              <div key={n} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{n}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
                <Badge variant="warning">Simulated</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Insurer APIs</CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.line === "life"
                      ? "Life, income protection, severe illness"
                      : "Vehicle, home, contents, pet"}
                  </p>
                </div>
                <Badge variant="warning">Simulated</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <p className="mb-6 text-xs text-muted-foreground">
        Simulated services run behind provider interfaces in the code, so each live API is swapped
        in without touching the workflow or the screens.
      </p>

      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Delivery queue</CardTitle>
          <Badge variant={failed.length ? "danger" : "success"}>
            {failed.length ? `${failed.length} failed, awaiting retry` : "All delivered"}
          </Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.queue.slice(0, 12).map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {fmtDateTime(q.ts)}
                  </TableCell>
                  <TableCell>{TARGET[q.target]}</TableCell>
                  <TableCell className="max-w-xs text-sm">
                    {q.action}
                    {q.lastError && (
                      <span className="block text-xs text-negative">{q.lastError}</span>
                    )}
                  </TableCell>
                  <TableCell>{q.clientName}</TableCell>
                  <TableCell>
                    <Badge variant={q.status === "delivered" ? "success" : "danger"}>
                      {q.status}
                    </Badge>
                    {q.attempts > 1 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {q.attempts} attempts
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {q.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toastResult(actions.retryQueue(q.id), "Retry succeeded")}
                      >
                        <RefreshCw /> Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Every outbound call is queued with automatic retry and exception logging, so a slow
            provider never loses a request.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CRM sync log</CardTitle>
        </CardHeader>
        <CardContent>
          {s.crmLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No records synced yet. Connect a CRM and complete a client step.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {s.crmLog.slice(0, 10).map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <strong>{l.clientName}</strong>: {l.object}{" "}
                    <span className="text-muted-foreground">{l.action.toLowerCase()} to</span>{" "}
                    {l.crm === "salesforce" ? "Salesforce" : "HubSpot"}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmtDateTime(l.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
