import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState } from "@/lib/domain/store";
import {
  SIGNATURE_LABEL,
  providerName,
  type CaseRecord,
  type RoaVersion,
} from "@/lib/domain/types";
import { fmtDateTime, zar } from "@/lib/fmt";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Documents | indigro" }] }),
  component: Documents,
});

interface Doc {
  id: string;
  title: string;
  client: string;
  date: string;
  status: "Signed" | "Current" | "Superseded" | "Issued";
  fingerprint: string;
  download?: () => void;
}

function roaText(c: CaseRecord, v: RoaVersion): string {
  const x = v.content;
  return [
    `RECORD OF ADVICE v${v.version}`,
    `Client: ${x.clientName}`,
    `Advisor: ${x.advisor}`,
    `FSP: ${x.fspName}`,
    `Basis: ${x.fnaMode === "full" ? "Full needs analysis" : "Single need (disclaimer signed)"}`,
    `Risk profile: ${x.riskProfile}`,
    "",
    "RECOMMENDATIONS",
    ...x.recommendations.map(
      (r) =>
        `- ${r.product} (${r.provider}): ${zar(r.cover)}${r.unit === "monthly" ? " p/m benefit" : " cover"}, ${zar(r.monthlyPremium)} p/m`,
    ),
    "",
    `Total premium: ${zar(x.totalMonthlyPremium)} p/m (${x.affordabilityPct}% of net income, ${x.affordability})`,
    "",
    "ADVISOR COMMENTARY",
    x.commentary,
    "",
    `Document fingerprint (SHA-256): ${v.hash}`,
    `Generated: ${fmtDateTime(v.createdAt)}`,
    `Case reference: ${c.code}`,
  ].join("\n");
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Documents() {
  const s = useAppState();
  const [q, setQ] = useState("");
  const role = s.session.role;
  const cases: CaseRecord[] =
    role === "client"
      ? s.cases.filter((c) => c.id === s.session.clientCaseId)
      : role === "advisor"
        ? s.cases.filter((c) => c.advisorId === s.advisors[0]!.id)
        : s.cases;

  const docs: Doc[] = cases.flatMap((c) => [
    ...c.signatures.map<Doc>((sg) => ({
      id: sg.id,
      title: `${SIGNATURE_LABEL[sg.kind]}${sg.roaVersion ? ` (ROA v${sg.roaVersion})` : ""}`,
      client: c.clientName,
      date: sg.signedAt,
      status: "Signed",
      fingerprint: sg.docHash,
    })),
    ...c.roa.map<Doc>((v) => {
      const signed = c.signatures.some((sg) => sg.kind === "roa" && sg.roaVersion === v.version);
      return {
        id: `roa-${c.id}-${v.version}`,
        title: `Record of Advice v${v.version}`,
        client: c.clientName,
        date: v.createdAt,
        status: signed ? "Signed" : v.version === c.roa.length ? "Current" : "Superseded",
        fingerprint: v.hash,
        download: () => download(`ROA-${c.code}-v${v.version}.txt`, roaText(c, v)),
      };
    }),
    ...c.applications
      .filter((a) => a.status === "issued")
      .map<Doc>((a) => ({
        id: `pol-${a.quoteId}`,
        title: `Policy schedule: ${a.product} (${providerName(a.providerId)})`,
        client: c.clientName,
        date: a.decidedAt ?? a.submittedAt,
        status: "Issued",
        fingerprint: a.policyNumber ?? "",
      })),
  ]);

  const rows = docs
    .filter((d) => (d.title + d.client).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        title={role === "client" ? "My documents" : "Documents & ROAs"}
        description="Everything signed or issued, with its tamper-evident fingerprint."
      />
      <Input
        className="mb-4 max-w-sm"
        placeholder="Search documents"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search documents"
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              {role !== "client" && <TableHead>Client</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fingerprint</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.title}</TableCell>
                {role !== "client" && <TableCell>{d.client}</TableCell>}
                <TableCell className="text-muted-foreground">{fmtDateTime(d.date)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      d.status === "Signed" || d.status === "Issued"
                        ? "success"
                        : d.status === "Current"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {d.fingerprint.slice(0, 14)}
                </TableCell>
                <TableCell className="text-right">
                  {d.download && (
                    <Button variant="ghost" size="sm" onClick={d.download}>
                      <Download /> Download
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No documents yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
