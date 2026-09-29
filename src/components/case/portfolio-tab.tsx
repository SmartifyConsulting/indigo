import { Database, Lock, Plus } from "lucide-react";
import { useState } from "react";

import { Field, GateList, LockedBanner, toastResult } from "@/components/common";
import { SignButton } from "@/components/sign-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { CaseRecord, ExternalPolicy } from "@/lib/domain/types";
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

const POLICY_TYPES: ExternalPolicy["type"][] = [
  "Life",
  "Disability",
  "Severe illness",
  "Retirement annuity",
  "Preservation Fund",
  "Unit trust",
  "Endowment",
  "Offshore",
  "Vehicle",
  "Household",
];

/** Captures a policy straight from the client's own documents, when Astute hasn't returned it. */
function AddPolicyDialog({
  caseId,
  open,
  onOpenChange,
}: {
  caseId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [form, setForm] = useState({
    provider: "",
    type: "Life" as ExternalPolicy["type"],
    reference: "",
    value: "",
    monthlyPremium: "",
  });

  const reset = () =>
    setForm({ provider: "", type: "Life", reference: "", value: "", monthlyPremium: "" });

  const add = () => {
    const r = actions.addExternalPolicy(caseId, {
      provider: form.provider.trim(),
      type: form.type,
      reference: form.reference.trim(),
      value: Number(form.value) || 0,
      monthlyPremium: Number(form.monthlyPremium) || 0,
    });
    if (toastResult(r, "Policy captured")) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add an existing policy</DialogTitle>
          <DialogDescription>
            For a policy the client sent you directly, before or instead of the Astute pull.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Provider">
              <Input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder="e.g. Old Mutual"
              />
            </Field>
            <Field label="Type">
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as ExternalPolicy["type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Policy / reference number">
            <Input
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cover / value (R)">
              <Input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </Field>
            <Field label="Monthly premium (R)" hint="Leave 0 if none">
              <Input
                type="number"
                value={form.monthlyPremium}
                onChange={(e) => setForm({ ...form, monthlyPremium: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={add}
            disabled={!form.provider.trim() || !form.reference.trim() || !form.value}
          >
            Add policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PortfolioTab({ c }: { c: CaseRecord }) {
  const s = useAppState();
  const gates = adviceGates(c);
  const locked = astuteLocked(c);
  const log = s.crmLog.filter((l) => l.caseId === c.id);
  const total = c.astute.policies.reduce((sum, p) => sum + p.monthlyPremium, 0);
  const [adding, setAdding] = useState(false);

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
            <div className="flex items-center gap-2">
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
              {!locked && (
                <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                  <Plus /> Add policy
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {c.astute.policies.length > 0 ? (
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
      <AddPolicyDialog caseId={c.id} open={adding} onOpenChange={setAdding} />
    </div>
  );
}
