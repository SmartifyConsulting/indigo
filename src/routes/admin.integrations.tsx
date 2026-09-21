import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  CreditCard,
  Eye,
  Lock,
  PlugZap,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isAdmin as isAdminFn } from "@/lib/admin.functions";
import { BRAND } from "@/lib/brand";
import { fmtDateTime } from "@/lib/fmt";
import { CATEGORY_LABEL, providerById } from "@/lib/integrations.catalog";
import {
  decideRoleRequest,
  listRoleRequests,
} from "@/lib/roles.functions";
import {
  integrationCostReport,
  listIntegrations,
  revealIntegrationSecrets,
  revokeIntegration,
  saveIntegration,
  testIntegration,
  type CostRow,
  type IntegrationRow,
} from "@/lib/integrations.functions";

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({
    meta: [
      { title: `API integrations | ${BRAND.name}` },
      {
        name: "description",
        content:
          "Administrator console for provider credentials, connection status, unit pricing and monthly running cost.",
      },
      { property: "og:title", content: `API integrations | ${BRAND.name}` },
      {
        property: "og:description",
        content: "Provider credentials, connection status and monthly running cost per API.",
      },
    ],
  }),
  component: AdminIntegrations,
});

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `${MONTH_NAMES[Number(mm) - 1]} ${y}`;
};

const money = (n: number) =>
  `R ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d)\.)/g, " ")}`;

function AdminIntegrations() {
  const checkAdmin = useServerFn(isAdminFn);
  const { data: adminData } = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin() });
  const admin = adminData?.admin === true;

  return (
    <div className="space-y-6">
      <PageHeader
        title="API integrations"
        description="Connections to data, identity, insurer and CRM services, with what each one costs to run."
      />

      {!admin && (
        <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-4">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            You can see connection status and history. Only an administrator can add, change or
            remove credentials.
          </p>
        </div>
      )}

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">Integrations</TabsTrigger>
          <TabsTrigger value="report">Integration report</TabsTrigger>
          {admin && <TabsTrigger value="access">Access requests</TabsTrigger>}
        </TabsList>
        <TabsContent value="services" className="mt-6">
          <ServicesTab admin={admin} />
        </TabsContent>
        <TabsContent value="access" className="mt-6">
          <AccessTab />
        </TabsContent>
        <TabsContent value="report" className="mt-6">
          {admin ? (
            <ReportTab />
          ) : (
            <p className="text-sm text-muted-foreground">
              The running-cost report is available to administrators.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccessTab() {
  const qc = useQueryClient();
  const load = useServerFn(listRoleRequests);
  const decide = useServerFn(decideRoleRequest);
  const { data, isLoading } = useQuery({ queryKey: ["role-requests"], queryFn: () => load(), retry: false });
  const decideM = useMutation({
    mutationFn: (v: { requestId: string; approve: boolean }) => decide({ data: v }),
    onSuccess: () => {
      toast.success("Access request updated");
      void qc.invalidateQueries({ queryKey: ["role-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const rows = data?.requests ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">People asking for elevated access</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Asked on</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium">{r.fullName || "—"}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                </TableCell>
                <TableCell className="capitalize">{r.role}</TableCell>
                <TableCell className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "pending" ? "outline" : "secondary"}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {r.status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        disabled={decideM.isPending}
                        onClick={() => decideM.mutate({ requestId: r.id, approve: true })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={decideM.isPending}
                        onClick={() => decideM.mutate({ requestId: r.id, approve: false })}
                      >
                        Decline
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Done</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  No access requests waiting.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ services */

function ServicesTab({ admin }: { admin: boolean }) {
  const load = useServerFn(listIntegrations);
  const { data, isLoading } = useQuery({ queryKey: ["integrations"], queryFn: () => load() });
  const [editing, setEditing] = useState<IntegrationRow | null>(null);

  const rows = data?.integrations ?? [];
  const active = rows.filter((r) => r.enabled || r.status === "connected");
  const inactive = rows.filter((r) => !(r.enabled || r.status === "connected"));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-4">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Every username, password, key and token on this page is encrypted before it is stored and
          is never sent back to the browser unless an administrator presses Reveal. Leave a secret
          field blank to keep the value already saved.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Column title="Active" rows={active} admin={admin} onEdit={setEditing} empty="Nothing turned on yet." />
        <Column title="Inactive" rows={inactive} admin={admin} onEdit={setEditing} empty="Everything is connected." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent API activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.log ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap">{fmtDateTime(l.ts)}</TableCell>
                  <TableCell>{l.integrationId}</TableCell>
                  <TableCell>
                    <Badge variant={l.outcome === "ok" ? "secondary" : "outline"}>{l.outcome}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.detail}</TableCell>
                </TableRow>
              ))}
              {(data?.log ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    No calls recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <EditDialog row={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function Column({
  title,
  rows,
  admin,
  onEdit,
  empty,
}: {
  title: string;
  rows: IntegrationRow[];
  admin: boolean;
  onEdit: (r: IntegrationRow) => void;
  empty: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {title}
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {rows.length}
        </Badge>
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        rows.map((r) => <ServiceCard key={r.id} row={r} admin={admin} onEdit={onEdit} />)
      )}
    </div>
  );
}

function ServiceCard({
  row,
  admin,
  onEdit,
}: {
  row: IntegrationRow;
  admin: boolean;
  onEdit: (r: IntegrationRow) => void;
}) {
  const qc = useQueryClient();
  const test = useServerFn(testIntegration);
  const revoke = useServerFn(revokeIntegration);
  const provider = providerById(row.id);

  const testM = useMutation({
    mutationFn: () => test({ data: { integrationId: row.id } }),
    onSuccess: (r) => {
      toast[r.outcome === "ok" ? "success" : "error"](`${row.name}: ${r.detail}`);
      void qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const revokeM = useMutation({
    mutationFn: () => revoke({ data: { integrationId: row.id } }),
    onSuccess: () => {
      toast.success(`${row.name} credentials removed`);
      void qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {CATEGORY_LABEL[row.category] ?? row.category}
              {row.environment ? ` · ${row.environment}` : ""}
            </p>
          </div>
          <Badge variant={row.status === "connected" ? "secondary" : "outline"}>
            {row.status === "connected" ? "Connected" : "Not configured"}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">{provider?.summary ?? row.description}</p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Price per unit</dt>
          <dd>
            {row.unitPrice === null
              ? "No price set"
              : `${money(row.unitPrice)} ${row.unitLabel || "per call"}`}
          </dd>
          <dt className="text-muted-foreground">Username</dt>
          <dd>{row.portalUsername || "—"}</dd>
          <dt className="text-muted-foreground">Key</dt>
          <dd>{row.keyHint ?? "—"}</dd>
          <dt className="text-muted-foreground">Last checked</dt>
          <dd>{row.lastCheckedAt ? fmtDateTime(row.lastCheckedAt) : "—"}</dd>
        </dl>

        <div className="flex flex-wrap gap-2">
          {admin && (
            <Button size="sm" onClick={() => onEdit(row)}>
              {row.status === "connected" ? "Manage" : "Connect"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={testM.isPending}
            onClick={() => testM.mutate()}
          >
            <PlugZap className="mr-1.5 h-3.5 w-3.5" /> Test
          </Button>
          {row.topUpUrl && (
            <a href={row.topUpUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Top up
              </Button>
            </a>
          )}
          {row.docsUrl && (
            <a href={row.docsUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost">
                <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Docs
              </Button>
            </a>
          )}
          {admin && row.status === "connected" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={revokeM.isPending}
              onClick={() => revokeM.mutate()}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EditDialog({ row, onClose }: { row: IntegrationRow; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(saveIntegration);
  const reveal = useServerFn(revealIntegrationSecrets);
  const provider = providerById(row.id);
  const fields = provider?.fields ?? [{ key: "api_key", label: "API key", secret: true }];

  const [form, setForm] = useState({
    enabled: row.enabled,
    environment: row.environment || "sandbox",
    baseUrl: row.baseUrl || provider?.baseUrl || "",
    portalUrl: row.portalUrl || provider?.portalUrl || "",
    portalUsername: row.portalUsername,
    topUpUrl: row.topUpUrl || provider?.topUpUrl || "",
    docsUrl: row.docsUrl || provider?.docsUrl || "",
    unitPrice: row.unitPrice === null ? "" : String(row.unitPrice),
    unitLabel: row.unitLabel || provider?.unitLabel || "",
  });
  const [values, setValues] = useState<Record<string, string>>({});

  const saveM = useMutation({
    mutationFn: () =>
      save({
        data: {
          integrationId: row.id,
          enabled: form.enabled,
          environment: form.environment,
          baseUrl: form.baseUrl,
          portalUrl: form.portalUrl,
          portalUsername: form.portalUsername,
          topUpUrl: form.topUpUrl,
          docsUrl: form.docsUrl,
          unitPrice: form.unitPrice.trim() === "" ? null : Number(form.unitPrice),
          unitLabel: form.unitLabel,
          secrets: values,
        },
      }),
    onSuccess: () => {
      toast.success(`${row.name} saved`);
      void qc.invalidateQueries({ queryKey: ["integrations"] });
      void qc.invalidateQueries({ queryKey: ["cost-report"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revealM = useMutation({
    mutationFn: () => reveal({ data: { integrationId: row.id } }),
    onSuccess: (r) => setValues((v) => ({ ...r.values, ...v })),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row.name}</DialogTitle>
          <DialogDescription>
            Credentials are encrypted at rest. Leave a secret field blank to keep the saved value.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Turn this service on for live use in the workspace.
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            />
          </div>

          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`f-${f.key}`}>
                {f.label}
                {f.secret && row.filledSecrets.includes(f.key) && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">saved</span>
                )}
              </Label>
              <Input
                id={`f-${f.key}`}
                type={f.secret ? "password" : "text"}
                autoComplete="off"
                placeholder={f.placeholder ?? (f.secret ? "Leave blank to keep current value" : "")}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
              {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
            </div>
          ))}

          <Button
            size="sm"
            variant="outline"
            onClick={() => revealM.mutate()}
            disabled={revealM.isPending}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Reveal stored values
          </Button>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="env">Environment</Label>
              <Select
                value={form.environment}
                onValueChange={(v) => setForm((f) => ({ ...f, environment: v }))}
              >
                <SelectTrigger id="env">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="base">API base URL</Label>
              <Input
                id="base"
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price per unit (R)</Label>
              <Input
                id="price"
                inputMode="decimal"
                placeholder="12.50"
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit of measure</Label>
              <Input
                id="unit"
                placeholder="per verification"
                value={form.unitLabel}
                onChange={(e) => setForm((f) => ({ ...f, unitLabel: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topup">Token top-up link</Label>
              <Input
                id="topup"
                value={form.topUpUrl}
                onChange={(e) => setForm((f) => ({ ...f, topUpUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="docs">Documentation link</Label>
              <Input
                id="docs"
                value={form.docsUrl}
                onChange={(e) => setForm((f) => ({ ...f, docsUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="portal">Provider portal link</Label>
              <Input
                id="portal"
                value={form.portalUrl}
                onChange={(e) => setForm((f) => ({ ...f, portalUrl: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------- report */

function ReportTab() {
  const load = useServerFn(integrationCostReport);
  const { data, isLoading, error } = useQuery({
    queryKey: ["cost-report"],
    queryFn: () => load(),
    retry: false,
  });

  const totals = useMemo(() => {
    const rows = data?.rows ?? [];
    const month = rows.reduce((s, r) => s + (r.currentCost ?? 0), 0);
    const calls = rows.reduce((s, r) => s + r.currentCalls, 0);
    const year = rows.reduce((s, r) => s + (r.totalCost ?? 0), 0);
    return { month, calls, year };
  }, [data]);

  if (error) return <p className="text-sm text-muted-foreground">{(error as Error).message}</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const currentMonth = data?.months[data.months.length - 1] ?? "";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={`Running cost, ${monthLabel(currentMonth)}`} value={money(totals.month)} />
        <Stat label="Calls this month" value={String(totals.calls)} />
        <Stat label="Last 12 months" value={money(totals.year)} />
      </div>

      <Accordion type="multiple" className="rounded-md border">
        {(data?.rows ?? []).map((r) => (
          <CostAccordionRow key={r.id} row={r} />
        ))}
      </Accordion>
      <p className="text-xs text-muted-foreground">
        Costs are measured from the calls this platform recorded, multiplied by the price per unit
        set against each service.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function CostAccordionRow({ row }: { row: CostRow }) {
  return (
    <AccordionItem value={row.id} className="px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex w-full items-center justify-between gap-4 pr-3 text-left">
          <div>
            <p className="text-sm font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {CATEGORY_LABEL[row.category] ?? row.category} ·{" "}
              {row.unitPrice === null
                ? "No price set"
                : `${money(row.unitPrice)} ${row.unitLabel || "per call"}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">
              {row.currentCost === null ? "No price set" : money(row.currentCost)}
            </p>
            <p className="text-xs text-muted-foreground">{row.currentCalls} calls this month</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead className="text-right">Failed</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...row.months].reverse().map((m) => (
              <TableRow key={m.month}>
                <TableCell>{monthLabel(m.month)}</TableCell>
                <TableCell className="text-right">{m.calls}</TableCell>
                <TableCell className="text-right">{m.failed}</TableCell>
                <TableCell className="text-right">
                  {m.cost === null ? "No price set" : money(m.cost)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AccordionContent>
    </AccordionItem>
  );
}
