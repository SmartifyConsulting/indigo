import { createFileRoute } from "@tanstack/react-router";
import { Download, Eye } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/common";
import { AdvisorSignatureMark, SignatureMark } from "@/components/sign-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { needLabel } from "@/lib/domain/quotes";
import { syntheticIp } from "@/lib/domain/signature-fonts";
import { useAppState } from "@/lib/domain/store";
import {
  SIGNATURE_LABEL,
  providerName,
  type Application,
  type CaseRecord,
  type RoaVersion,
  type Signature,
} from "@/lib/domain/types";
import { fmtDateTime, zar } from "@/lib/fmt";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Documents | indigro" }] }),
  component: Documents,
});

const GENERAL_GROUP = "Advice & Compliance";

const SMALL_WORDS = new Set(["a", "an", "and", "of", "the", "in", "for", "to"]);

/** needLabel() returns sentence case ("Vehicle insurance"); the accordion group headers need Title Case. */
function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w[0]?.toUpperCase() + w.slice(1)))
    .join(" ");
}

interface Doc {
  id: string;
  title: string;
  client: string;
  date: string;
  status: "Signed" | "Current" | "Superseded" | "Issued";
  fingerprint: string;
  signature?: Signature;
  policyType: string;
  caseRec: CaseRecord;
  advisorName: string;
  filename: string;
  content: string;
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

function signatureText(c: CaseRecord, sg: Signature): string {
  return [
    SIGNATURE_LABEL[sg.kind].toUpperCase(),
    `Client: ${c.clientName}`,
    `Case reference: ${c.code}`,
    "",
    `Signed by: ${sg.signerName}`,
    `Signed at: ${fmtDateTime(sg.signedAt)}`,
    `IP address: ${sg.ipAddress ?? syntheticIp(sg.id)}`,
    sg.roaVersion ? `Applies to: Record of Advice v${sg.roaVersion}` : "",
    "",
    `Document fingerprint (SHA-256): ${sg.docHash}`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

function policyText(c: CaseRecord, a: Application): string {
  return [
    "POLICY SCHEDULE",
    `Product: ${a.product}`,
    `Insurer: ${providerName(a.providerId)}`,
    `Client: ${c.clientName}`,
    `Case reference: ${c.code}`,
    "",
    `Policy number: ${a.policyNumber ?? "—"}`,
    `Status: ${a.status}`,
    `Issued: ${a.decidedAt ? fmtDateTime(a.decidedAt) : "—"}`,
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

function DocActions({ doc, onPreview }: { doc: Doc; onPreview: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="ghost" aria-label={`Preview ${doc.title}`} onClick={onPreview}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Download ${doc.title}`}
        onClick={() => download(doc.filename, doc.content)}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: Doc["status"] }) {
  return (
    <Badge
      variant={
        status === "Signed" || status === "Issued"
          ? "success"
          : status === "Current"
            ? "warning"
            : "secondary"
      }
    >
      {status}
    </Badge>
  );
}

function DocTable({
  docs,
  showClient,
  onPreview,
}: {
  docs: Doc[];
  showClient: boolean;
  onPreview: (d: Doc) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          {showClient && <TableHead>Client</TableHead>}
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Signature</TableHead>
          <TableHead>Fingerprint</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="font-medium">{d.title}</TableCell>
            {showClient && <TableCell>{d.client}</TableCell>}
            <TableCell className="text-muted-foreground">{fmtDateTime(d.date)}</TableCell>
            <TableCell>
              <StatusBadge status={d.status} />
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap items-end gap-4">
                {d.signature && <SignatureMark sig={d.signature} />}
                {(d.signature || d.id.startsWith("roa-")) && (
                  <AdvisorSignatureMark c={d.caseRec} advisorName={d.advisorName} />
                )}
              </div>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {d.fingerprint.slice(0, 14)}
            </TableCell>
            <TableCell className="text-right">
              <DocActions doc={d} onPreview={() => onPreview(d)} />
            </TableCell>
          </TableRow>
        ))}
        {docs.length === 0 && (
          <TableRow>
            <TableCell colSpan={showClient ? 7 : 6} className="py-8 text-center text-muted-foreground">
              No documents yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function PreviewDialog({ doc, onOpenChange }: { doc: Doc | null; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={!!doc} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{doc?.title}</DialogTitle>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border bg-background p-4 font-mono text-xs leading-5 text-foreground">
          {doc?.content}
        </pre>
        {doc && (
          <Button
            variant="outline"
            className="self-end"
            onClick={() => download(doc.filename, doc.content)}
          >
            <Download /> Download
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Groups documents by policy type, with advice & compliance documents last. */
function PolicyGroups({
  docs,
  showClient,
  onPreview,
}: {
  docs: Doc[];
  showClient: boolean;
  onPreview: (d: Doc) => void;
}) {
  const groups = Object.entries(
    docs.reduce<Record<string, Doc[]>>((acc, d) => {
      (acc[d.policyType] ??= []).push(d);
      return acc;
    }, {}),
  ).sort(([a], [b]) => (a === GENERAL_GROUP ? 1 : b === GENERAL_GROUP ? -1 : a.localeCompare(b)));
  if (groups.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">No documents yet.</p>;
  return (
    <Accordion type="multiple" defaultValue={groups.map(([t]) => t)}>
      {groups.map(([type, groupDocs]) => (
        <AccordionItem key={type} value={type}>
          <AccordionTrigger className="text-sm">
            <span className="flex items-center gap-2">
              <span className="label-caps text-navy">{titleCase(type)}</span>
              <span className="text-xs font-normal text-muted-foreground">{groupDocs.length}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <DocTable docs={groupDocs} showClient={showClient} onPreview={onPreview} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

const POLICY_TYPE_LABEL: Record<string, string> = {
  "severe-illness": "Chronic & Severe Illness",
  disability: "Income Protection",
  life: "Life Cover",
};

function policyTypeOf(needId: Parameters<typeof needLabel>[0]): string {
  return POLICY_TYPE_LABEL[needId] ?? needLabel(needId);
}

function Documents() {
  const s = useAppState();
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<Doc | null>(null);
  const role = s.session.role;
  const cases: CaseRecord[] =
    role === "client"
      ? s.cases.filter((c) => c.id === s.session.clientCaseId)
      : role === "advisor"
        ? s.cases.filter((c) => c.advisorId === s.advisors[0]!.id)
        : s.cases;

  const advisorOf = (c: CaseRecord) =>
    s.advisors.find((a) => a.id === c.advisorId)?.name ?? "Wealth manager";
  const docs: Doc[] = cases.flatMap((c) => [
    ...c.signatures.map<Doc>((sg) => ({
      id: sg.id,
      title: `${SIGNATURE_LABEL[sg.kind]}${sg.roaVersion ? ` (ROA v${sg.roaVersion})` : ""}`,
      client: c.clientName,
      caseRec: c,
      advisorName: advisorOf(c),
      date: sg.signedAt,
      status: "Signed",
      fingerprint: sg.docHash,
      signature: sg,
      policyType: GENERAL_GROUP,
      filename: `${sg.kind}-${c.code}.txt`,
      content: signatureText(c, sg),
    })),
    ...c.roa.map<Doc>((v) => {
      const signed = c.signatures.some((sg) => sg.kind === "roa" && sg.roaVersion === v.version);
      return {
        id: `roa-${c.id}-${v.version}`,
        title: `Record of Advice v${v.version}`,
        client: c.clientName,
        caseRec: c,
        advisorName: advisorOf(c),
      caseRec: c,
      advisorName: advisorOf(c),
        date: v.createdAt,
        status: signed ? "Signed" : v.version === c.roa.length ? "Current" : "Superseded",
        fingerprint: v.hash,
        policyType: GENERAL_GROUP,
        filename: `ROA-${c.code}-v${v.version}.txt`,
        content: roaText(c, v),
      };
    }),
    ...c.applications
      .filter((a) => a.status === "issued")
      .map<Doc>((a) => {
        const quote = c.quotes.items.find((q) => q.id === a.quoteId);
        return {
          id: `pol-${a.quoteId}`,
          title: `Policy schedule: ${a.product} (${providerName(a.providerId)})`,
          client: c.clientName,
          caseRec: c,
          advisorName: advisorOf(c),
        caseRec: c,
        advisorName: advisorOf(c),
      caseRec: c,
      advisorName: advisorOf(c),
          date: a.decidedAt ?? a.submittedAt,
          status: "Issued",
          fingerprint: a.policyNumber ?? "",
          policyType: quote ? policyTypeOf(quote.needId) : "Other policies",
          filename: `Policy-${a.policyNumber ?? c.code}.txt`,
          content: policyText(c, a),
        };
      }),
  ]);

  const rows = docs
    .filter((d) => (d.title + d.client).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  const clientGroups = Object.entries(
    rows.reduce<Record<string, Doc[]>>((acc, d) => {
      (acc[d.client] ??= []).push(d);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <PageHeader
        title={role === "client" ? "My Documents" : "Documents & ROAs"}
        description="Everything signed or issued, with its tamper-evident fingerprint."
      />
      <Input
        className="mb-4 max-w-sm"
        placeholder="Search documents"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search documents"
      />
      {role === "client" ? (
        <Card className="px-4">
          <PolicyGroups docs={rows} showClient={false} onPreview={setPreview} />
        </Card>
      ) : (
        <Card className="px-4">
          <Accordion type="multiple" defaultValue={clientGroups.slice(0, 1).map(([k]) => k)}>
            {clientGroups.map(([client, clientDocs]) => (
              <AccordionItem key={client} value={client}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-1 rounded-full bg-brand" aria-hidden />
                    {client}
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand-ink">
                      {clientDocs.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-4">
                  <PolicyGroups docs={clientDocs} showClient={false} onPreview={setPreview} />
                </AccordionContent>
              </AccordionItem>
            ))}
            {clientGroups.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No documents yet.</p>
            )}
          </Accordion>
        </Card>
      )}
      <PreviewDialog doc={preview} onOpenChange={(o) => !o && setPreview(null)} />
    </>
  );
}
