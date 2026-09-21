import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Check, Copy, ScanFace, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Field, GateList, LockedBanner, toastResult } from "@/components/common";
import { SignButton } from "@/components/sign-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adviceGates, hasSig } from "@/lib/domain/gates";
import { needLabel } from "@/lib/domain/quotes";
import { actions } from "@/lib/domain/store";
import { SIGNATURE_LABEL, type CaseRecord, type NeedId } from "@/lib/domain/types";
import { fmtDateTime } from "@/lib/fmt";

const SINGLE_NEEDS: NeedId[] = [
  "life",
  "disability",
  "severe-illness",
  "vehicle",
  "home-building",
  "home-contents",
  "pet-cover",
];

export function useOrigin() {
  const [origin, setOrigin] = useState("https://demo.indigro.co.za");
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

export function OnboardingTab({ c }: { c: CaseRecord }) {
  const origin = useOrigin();
  const link = `${origin}/onboard/${c.code}`;
  const [idNumber, setIdNumber] = useState(c.idNumber);
  const [single, setSingle] = useState<NeedId>(c.singleNeed?.needId ?? "life");
  const [amount, setAmount] = useState(String(c.singleNeed?.amount ?? 1_000_000));
  const gates = adviceGates(c);

  const verify = () => {
    actions.updateProfile(c.id, { idNumber });
    toastResult(actions.verifyIdentity(c.id), "Liveness verified and screening complete");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {c.identity.sanctions === "hit" && (
          <div className="flex items-start gap-3 rounded-lg border border-negative/30 bg-negative-soft p-4 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
            <div>
              <p className="font-medium text-negative">Potential sanctions / PEP match</p>
              <p className="mt-0.5 text-foreground">
                Onboarding is halted and escalated to the Key Individual. No disclosures can be
                signed and no quotes can be requested until the match is cleared.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>1. Client gateway</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-[auto_1fr]">
            <div className="w-fit rounded-md border bg-white p-3">
              <QRCodeSVG value={link} size={132} />
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                The client scans this code, or opens the secure link, to verify their identity and
                sign the pre-quote disclosure and Letter of Authority on their own device.
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border bg-background px-3 py-2 text-xs">
                  {link}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copy link"
                  onClick={() => {
                    void navigator.clipboard?.writeText(link);
                    toast.success("Link copied");
                  }}
                >
                  <Copy />
                </Button>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={`/onboard/${c.code}`} target="_blank" rel="noreferrer">
                  Open the client's view
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Identity, screening and mandates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!c.identity.livenessVerified ? (
              <div className="flex flex-wrap items-end gap-3">
                <Field label="ID number (13 digits)">
                  <Input
                    className="w-56"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="9001015009087"
                    inputMode="numeric"
                  />
                </Field>
                <Button onClick={verify}>
                  <ScanFace /> Run liveness and screening
                </Button>
                <p className="w-full text-xs text-muted-foreground">
                  Prototype: runs the DIDIT liveness and Home Affairs check and the L0 sanctions/PEP
                  screen as a simulated call. Names containing "PEP" return a match, to demonstrate
                  the escalation path.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="success">Liveness verified</Badge>
                <span className="text-muted-foreground">
                  {c.identity.livenessRef} ·{" "}
                  {c.identity.livenessAt && fmtDateTime(c.identity.livenessAt)}
                </span>
                <Badge variant={c.identity.sanctions === "clear" ? "success" : "danger"}>
                  Screening: {c.identity.sanctions === "clear" ? "clear" : "match"}
                </Badge>
              </div>
            )}

            <div className="divide-y rounded-md border">
              {(["disclosure", "loa"] as const).map((k) => {
                const sig = c.signatures.find((x) => x.kind === k);
                return (
                  <div
                    key={k}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{SIGNATURE_LABEL[k]}</p>
                      {sig && (
                        <p className="text-xs text-muted-foreground">
                          Signed {fmtDateTime(sig.signedAt)} · fingerprint{" "}
                          {sig.docHash.slice(0, 12)}
                        </p>
                      )}
                    </div>
                    {sig ? (
                      <Badge variant="success">
                        <Check className="h-3 w-3" /> Signed
                      </Badge>
                    ) : (
                      <SignButton
                        caseId={c.id}
                        kind={k}
                        label="Client signs here"
                        variant="outline"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Needs analysis route</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() =>
                  toastResult(actions.chooseRoute(c.id, "full"), "Full needs analysis selected")
                }
                className={`rounded-lg border p-4 text-left text-sm transition-colors ${c.fnaMode === "full" ? "border-primary bg-primary-soft" : "hover:bg-accent"}`}
              >
                <p className="font-medium">Full financial needs analysis</p>
                <p className="mt-1 text-muted-foreground">
                  Life, short-term and investment gaps, calculated objectively.
                </p>
              </button>
              <div
                className={`rounded-lg border p-4 text-sm ${c.fnaMode === "single-need" ? "border-primary bg-primary-soft" : ""}`}
              >
                <p className="font-medium">Single need only</p>
                <p className="mt-1 text-muted-foreground">
                  Client declines a full analysis. A signed disclaimer is required.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <Select value={single} onValueChange={(v) => setSingle(v as NeedId)}>
                    <SelectTrigger className="w-44" aria-label="Single need">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SINGLE_NEEDS.map((n) => (
                        <SelectItem key={n} value={n}>
                          {needLabel(n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-32"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-label="Amount"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      toastResult(
                        actions.chooseRoute(c.id, "single-need", {
                          needId: single,
                          amount: Number(amount),
                        }),
                        "Single-need route selected",
                      )
                    }
                  >
                    Select
                  </Button>
                </div>
              </div>
            </div>
            {c.fnaMode === "single-need" && (
              <div className="flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm">
                <span className="font-medium">{SIGNATURE_LABEL["single-need"]}</span>
                {hasSig(c, "single-need") ? (
                  <Badge variant="success">
                    <Check className="h-3 w-3" /> Signed
                  </Badge>
                ) : (
                  <SignButton
                    caseId={c.id}
                    kind="single-need"
                    label="Client signs here"
                    variant="outline"
                    disabled={!gates.every((g) => g.met)}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-5">
            <GateList gates={gates} title="Hard stops before any advice" />
          </CardContent>
        </Card>
        <LockedBanner>
          <p className="font-medium">Enforced in code</p>
          <p className="mt-0.5 text-muted-foreground">
            Astute pulls, the needs analysis and quote requests all refuse to run while any item on
            this list is unmet. Every refused attempt is written to the audit ledger.
          </p>
        </LockedBanner>
      </div>
    </div>
  );
}
