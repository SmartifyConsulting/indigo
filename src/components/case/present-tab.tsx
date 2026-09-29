import { Check, FileUp, Send } from "lucide-react";
import { useRef } from "react";

import { GateList, toastResult } from "@/components/common";
import { RoaSummary } from "@/components/case/quotes-tab";
import { AdvisorSignatureMark, SignButton, SignatureMark } from "@/components/sign-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { latestRoa, roaSigned, sigCurrent, submissionGates } from "@/lib/domain/gates";
import { actions } from "@/lib/domain/store";
import { SIGNATURE_LABEL, type CaseRecord, type SignatureKind } from "@/lib/domain/types";
import { fmtDateTime } from "@/lib/fmt";

function SigRow({ c, kind, disabled }: { c: CaseRecord; kind: SignatureKind; disabled?: boolean }) {
  const v = latestRoa(c);
  const sig = c.signatures.find((s) => s.kind === kind && s.roaVersion === v?.version);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
      <div>
        <p className="font-medium">{SIGNATURE_LABEL[kind]}</p>
        <p className="text-xs text-muted-foreground">
          {sig
            ? `ROA v${sig.roaVersion}`
            : v
              ? `Applies to ROA v${v.version}`
              : "Requires a Record of Advice"}
        </p>
      </div>
      {sig ? (
        <div className="flex items-center gap-3">
          <SignatureMark sig={sig} className="text-right" />
          {v && <AdvisorSignatureMark c={c} advisorName={v.content.advisor} className="text-right" />}
          <Badge variant="success">
            <Check className="h-3 w-3" /> Signed
          </Badge>
        </div>
      ) : (
        <SignButton
          caseId={c.id}
          kind={kind}
          label="Client signs here"
          variant="outline"
          disabled={disabled || !v}
        />
      )}
    </div>
  );
}

export const FICA_DOCS = [
  { key: "idDocument", label: "Identity document" },
  { key: "proofOfResidence", label: "Proof of residence" },
  { key: "bankStatement", label: "Bank statement" },
] as const;

export function FicaRow({
  c,
  docKey,
  label,
}: {
  c: CaseRecord;
  docKey: (typeof FICA_DOCS)[number]["key"];
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const file = c.fica[docKey];
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{file ?? "Not uploaded"}</p>
      </div>
      <input
        ref={ref}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) actions.uploadFica(c.id, docKey, f.name);
        }}
      />
      <Button variant="outline" size="sm" onClick={() => ref.current?.click()}>
        <FileUp /> {file ? "Replace" : "Upload"}
      </Button>
    </div>
  );
}

export function PresentTab({ c }: { c: CaseRecord }) {
  const roa = latestRoa(c);
  const gates = submissionGates(c);
  const submitted = c.applications.length > 0;

  if (!roa) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Select quotes on the Quotes &amp; ROA tab first. The Record of Advice is generated from
          your selection and presented here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Present to the client (ROA v{roa.version})</CardTitle>
            <Badge variant={roaSigned(c) ? "success" : "warning"}>
              {roaSigned(c) ? "Signed" : "Awaiting signature"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <RoaSummary content={roa.content} />
            {!roaSigned(c) && (
              <p className="text-xs text-muted-foreground">
                If the client changes an option, go back to Quotes &amp; ROA. The ROA is
                re-versioned and must be signed again, and any debit order or declaration signed
                against the old version lapses.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>E-signatures</CardTitle>
          </CardHeader>
          <CardContent className="divide-y rounded-md border p-0">
            <SigRow c={c} kind="roa" />
            <SigRow c={c} kind="debit-order" disabled={!roaSigned(c)} />
            {c.quotes.items.some(
              (q) =>
                c.quotes.selectedIds.includes(q.id) &&
                ["life", "disability", "severe-illness"].includes(q.needId),
            ) && <SigRow c={c} kind="life-declaration" disabled={!roaSigned(c)} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FICA documents and bank validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y rounded-md border">
              {FICA_DOCS.map((d) => (
                <FicaRow key={d.key} c={c} docKey={d.key} label={d.label} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  toastResult(actions.validateBank(c.id), "FICA and bank details validated")
                }
                disabled={!!c.fica.bankValidatedAt}
              >
                Validate bank details and screen
              </Button>
              {c.fica.bankValidatedAt && (
                <Badge variant="success">Validated {fmtDateTime(c.fica.bankValidatedAt)}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 p-5">
            <GateList gates={gates} title="Required before submission" />
            <Button
              className="w-full"
              onClick={() =>
                toastResult(actions.submitApplication(c.id), "Application submitted to insurers")
              }
              disabled={submitted}
            >
              <Send /> {submitted ? "Submitted" : "Submit application"}
            </Button>
          </CardContent>
        </Card>
        {c.quotes.items.some(
          (q) => c.quotes.selectedIds.includes(q.id) && q.underwriting === "medical",
        ) && (
          <Card>
            <CardHeader>
              <CardTitle>Medical underwriting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                On submission the client receives an encrypted health-disclosure link in their
                portal. Answers go straight to the insurer and are never held by the advisor or the
                FSP.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={
                    c.execution.underwritingMode === "self-service" || !c.execution.underwritingMode
                      ? "default"
                      : "outline"
                  }
                  onClick={() => actions.sendUnderwritingLink(c.id, "self-service")}
                >
                  Client self-service link
                </Button>
                <Button
                  size="sm"
                  variant={c.execution.underwritingMode === "tele" ? "default" : "outline"}
                  onClick={() => actions.sendUnderwritingLink(c.id, "tele")}
                >
                  Insurer tele-underwriting
                </Button>
              </div>
              {c.execution.underwritingLinkSentAt && (
                <p className="text-xs text-muted-foreground">
                  {c.execution.underwritingMode === "tele" ? "Referred" : "Link sent"}{" "}
                  {fmtDateTime(c.execution.underwritingLinkSentAt)}
                  {c.execution.medicalCompletedAt
                    ? ` · completed ${fmtDateTime(c.execution.medicalCompletedAt)}`
                    : " · awaiting client"}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export { sigCurrent };
