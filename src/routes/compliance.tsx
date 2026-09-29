import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ShieldCheck, ShieldX } from "lucide-react";
import { useState } from "react";

import { PageHeader, RequireRole, StatCard } from "@/components/common";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isComplete } from "@/lib/domain/gates";
import { LEDGER_TONE, verifyLedger, type Verification } from "@/lib/domain/ledger";
import { useAppState } from "@/lib/domain/store";
import type { LedgerEvent } from "@/lib/domain/types";
import { fmtDateTime } from "@/lib/fmt";

export const Route = createFileRoute("/compliance")({
  head: () => ({ meta: [{ title: "Compliance & audit | indigro" }] }),
  component: () => (
    <RequireRole roles={["fsp"]}>
      <Compliance />
    </RequireRole>
  ),
});

const RULES = [
  {
    rule: "No advice before identity",
    detail:
      "Liveness verification and L0 sanctions/PEP screening must pass before any mandate can be signed.",
  },
  {
    rule: "Disclosure before Letter of Authority",
    detail:
      "The pre-quote advisor disclosure is signed first; the LOA cannot be signed without it.",
  },
  {
    rule: "No Astute pull without a signed LOA",
    detail: "Portfolio retrieval refuses to run until every advice gate is met.",
  },
  {
    rule: "Cross-alert lock",
    detail:
      "If another brokerage queries the client, portfolio data locks until an updated authority mandate is signed.",
  },
  {
    rule: "No quotes without a needs route",
    detail: "Either a completed full analysis, or a signed single-need disclaimer.",
  },
  {
    rule: "ROA changes require re-signature",
    detail:
      "Any change to selected options creates a new ROA version. Signatures against older versions lapse, including the debit order and declaration.",
  },
  {
    rule: "No submission without FICA and signatures",
    detail:
      "Documents, bank validation, current ROA, debit order and (for life) the declaration must all be in place.",
  },
  {
    rule: "Medical answers stay private",
    detail:
      "Health disclosures go to the insurer through an encrypted link and are never held by the advisor or FSP.",
  },
];

function toCsv(events: LedgerEvent[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    "seq,timestamp,case_id,actor_role,actor,type,summary,prev_hash,hash",
    ...events.map((e) =>
      [
        e.seq,
        e.ts,
        e.caseId ?? "",
        e.actor.role,
        esc(e.actor.name),
        e.type,
        esc(e.summary),
        e.prevHash,
        e.hash,
      ].join(","),
    ),
  ].join("\n");
}

function save(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Compliance() {
  const s = useAppState();
  const [check, setCheck] = useState<{ v: Verification; label: string } | null>(null);
  const blocked = s.ledger.filter((e) => e.type === "GATE_BLOCKED");
  const escalations = s.cases.filter((c) => c.identity.sanctions === "hit");
  const alerts = s.cases.filter((c) => c.astute.alert && !c.astute.alert.resolvedAt);
  const [filter, setFilter] = useState<"all" | "blocked" | "signed">("all");
  const shown = [...s.ledger]
    .reverse()
    .filter((e) =>
      filter === "blocked"
        ? e.type === "GATE_BLOCKED"
        : filter === "signed"
          ? e.type === "DOCUMENT_SIGNED"
          : true,
    )
    .slice(0, 60);

  const runVerify = () => setCheck({ v: verifyLedger(s.ledger), label: "Live ledger" });
  const runTamper = () => {
    const copy = structuredClone(s.ledger);
    const i = Math.min(12, copy.length - 1);
    copy[i]!.summary = copy[i]!.summary.replace(/\S+/, "EDITED");
    setCheck({
      v: verifyLedger(copy),
      label: `Demonstration copy with entry #${copy[i]!.seq} edited`,
    });
  };

  return (
    <>
      <PageHeader
        title="Compliance & Audit"
        description="Supervise advisors in real time and evidence every step for internal audit, external compliance officers and the FSCA."
      />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ledger">Audit ledger</TabsTrigger>
          <TabsTrigger value="rules">Enforced rules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Open escalations"
              value={escalations.length}
              tone={escalations.length ? "danger" : "success"}
              hint="Sanctions / PEP matches"
            />
            <StatCard
              label="Open Astute alerts"
              value={alerts.length}
              tone={alerts.length ? "warning" : "success"}
            />
            <StatCard
              label="Steps refused"
              value={blocked.length}
              hint="Out-of-order actions stopped"
            />
            <StatCard
              label="Files complete"
              value={s.cases.filter(isComplete).length}
              tone="success"
              hint={`of ${s.cases.length} clients`}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Needs the Key Individual</CardTitle>
            </CardHeader>
            <CardContent>
              {escalations.length + alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {escalations.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                      <span>
                        <Badge variant="danger" className="mr-2">
                          Sanctions / PEP
                        </Badge>
                        <strong>{c.clientName}</strong>: potential match, onboarding halted
                      </span>
                      <Link
                        to="/clients/$clientId"
                        params={{ clientId: c.id }}
                        className="text-primary hover:underline"
                      >
                        Review
                      </Link>
                    </li>
                  ))}
                  {alerts.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                      <span>
                        <Badge variant="warning" className="mr-2">
                          Astute alert
                        </Badge>
                        <strong>{c.clientName}</strong>: {c.astute.alert!.brokerage} queried the
                        client
                      </span>
                      <Link
                        to="/clients/$clientId"
                        params={{ clientId: c.id }}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Refused actions (most recent)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {[...blocked]
                  .reverse()
                  .slice(0, 6)
                  .map((e) => (
                    <li key={e.seq} className="py-2.5">
                      {e.summary}
                      <span className="block text-xs text-muted-foreground">
                        {s.cases.find((c) => c.id === e.caseId)?.clientName} · {fmtDateTime(e.ts)}
                      </span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-6">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-medium">
                  {s.ledger.length} entries, each sealed with the hash of the one before
                </p>
                <p className="text-xs text-muted-foreground">
                  Editing or removing any entry breaks every hash after it. In production the chain
                  is anchored to write-once storage.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={runVerify}>
                  <ShieldCheck /> Verify integrity
                </Button>
                <Button variant="outline" onClick={runTamper}>
                  <ShieldX /> Simulate tampering
                </Button>
                <Button
                  variant="outline"
                  onClick={() => save("indigro-audit-ledger.csv", toCsv(s.ledger), "text/csv")}
                >
                  <Download /> CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    save(
                      "indigro-audit-ledger.json",
                      JSON.stringify(s.ledger, null, 2),
                      "application/json",
                    )
                  }
                >
                  <Download /> JSON
                </Button>
              </div>
              {check && (
                <div
                  className={`w-full rounded-md border p-3 text-sm ${check.v.ok ? "border-positive/30 bg-positive-soft text-positive" : "border-negative/30 bg-negative-soft text-negative"}`}
                >
                  <strong>{check.label}:</strong>{" "}
                  {check.v.ok
                    ? `all ${check.v.checked} entries verified. No tampering detected.`
                    : `integrity failure at entry #${check.v.brokenAtSeq}. ${check.v.reason}.`}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex gap-2">
            {(["all", "blocked", "signed"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f === "blocked" ? "Refused steps" : f === "signed" ? "Signatures" : "All events"}
              </Button>
            ))}
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((e) => (
                  <TableRow key={e.seq}>
                    <TableCell className="text-muted-foreground">{e.seq}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {fmtDateTime(e.ts)}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <Badge variant={LEDGER_TONE[e.type] ?? "secondary"} className="mb-1">
                        {e.type.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                      <p className="text-sm">{e.summary}</p>
                    </TableCell>
                    <TableCell className="text-sm">{e.actor.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {e.hash.slice(0, 10)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardContent className="divide-y p-0">
              {RULES.map((r) => (
                <div key={r.rule} className="px-5 py-4">
                  <p className="text-sm font-medium">{r.rule}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{r.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
