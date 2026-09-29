import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, PlugZap, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  isAdmin as isAdminFn,
  listIntegrations,
  revokeIntegrationKey,
  saveIntegrationKey,
  testIntegration,
  type IntegrationRow,
} from "@/lib/admin.functions";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/use-auth";
import { fmtDateTime } from "@/lib/fmt";

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({
    meta: [
      { title: `API keys and integrations | ${BRAND.name}` },
      {
        name: "description",
        content: "Administrator console for provider API credentials, status and call history.",
      },
      { property: "og:title", content: `API keys and integrations | ${BRAND.name}` },
      {
        property: "og:description",
        content: "Administrator console for provider API credentials, status and call history.",
      },
    ],
  }),
  component: AdminIntegrations,
});

const CATEGORY_LABEL: Record<string, string> = {
  data: "Data services",
  identity: "Identity and screening",
  insurer: "Insurer quoting APIs",
  crm: "CRM",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary"> = {
  connected: "success",
  error: "warning",
  "not-configured": "secondary",
};

function AdminIntegrations() {
  const qc = useQueryClient();
  const load = useServerFn(listIntegrations);
  const checkAdmin = useServerFn(isAdminFn);
  const saveKey = useServerFn(saveIntegrationKey);
  const revokeKey = useServerFn(revokeIntegrationKey);
  const testKey = useServerFn(testIntegration);

  const { session } = useAuth();
  const userId = session?.user.id;
  const admin = useQuery({
    queryKey: ["is-admin", userId],
    queryFn: () => checkAdmin(),
    enabled: !!userId,
    retry: false,
  });
  const data = useQuery({
    queryKey: ["integrations", userId],
    queryFn: () => load(),
    enabled: !!userId,
    retry: false,
  });
  const [editing, setEditing] = useState<IntegrationRow | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [baseUrl, setBaseUrl] = useState("");

  const refresh = () => void qc.invalidateQueries({ queryKey: ["integrations"] });

  const save = useMutation({
    mutationFn: () =>
      saveKey({
        data: {
          integrationId: editing!.id,
          apiKey,
          environment,
          baseUrl,
        },
      }),
    onSuccess: () => {
      toast.success("API key saved");
      setEditing(null);
      setApiKey("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeKey({ data: { integrationId: id } }),
    onSuccess: () => {
      toast.success("API key removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: (id: string) => testKey({ data: { integrationId: id } }),
    onSuccess: (r) => {
      if (r.outcome === "ok") toast.success(`${r.detail} (${r.latencyMs} ms)`);
      else toast.warning(r.detail);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isAdminUser = admin.data?.admin === true;
  const groups = Object.entries(
    (data.data?.integrations ?? []).reduce<Record<string, IntegrationRow[]>>((acc, row) => {
      (acc[row.category] ??= []).push(row);
      return acc;
    }, {}),
  );

  return (
    <>
      <PageHeader
        title="APIs and Credentials"
        description="Administrator console: store and rotate provider keys, check connections and review call history."
      />

      {!isAdminUser && (
        <Card className="mb-6 border-warning/40">
          <CardContent className="flex items-start gap-3 p-5 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-warning" />
            <p>
              You can see connection status and history. Only administrators can add, rotate or
              remove credentials.
            </p>
          </CardContent>
        </Card>
      )}

      {groups.map(([category, rows]) => (
        <Card key={category} className="mb-6">
          <CardHeader>
            <CardTitle>{CATEGORY_LABEL[category] ?? category}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Last checked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.description}</p>
                    </TableCell>
                    <TableCell className="capitalize">{row.environment}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.keyHint ?? "—"}
                      {row.lastRotatedAt && (
                        <span className="block font-sans text-xs text-muted-foreground">
                          rotated {fmtDateTime(row.lastRotatedAt)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {row.lastCheckedAt ? fmtDateTime(row.lastCheckedAt) : "Never"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>
                        {row.status === "not-configured" ? "No key" : row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isAdminUser || test.isPending}
                          onClick={() => test.mutate(row.id)}
                        >
                          <PlugZap /> Test
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isAdminUser}
                          onClick={() => {
                            setEditing(row);
                            setApiKey("");
                            setEnvironment(row.environment === "production" ? "production" : "sandbox");
                            setBaseUrl(row.baseUrl);
                          }}
                        >
                          <KeyRound /> {row.status === "connected" ? "Rotate" : "Add key"}
                        </Button>
                        {row.status === "connected" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!isAdminUser}
                            onClick={() => revoke.mutate(row.id)}
                            aria-label={`Remove ${row.name} key`}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent API activity</CardTitle>
          <Button size="sm" variant="outline" onClick={refresh}>
            <RefreshCw /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {(data.data?.log ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No calls recorded yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {(data.data?.log ?? []).map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <strong>{l.integrationId}</strong>{" "}
                    <span className="text-muted-foreground">{l.outcome}</span> — {l.detail}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmtDateTime(l.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
            <DialogDescription>
              The key is stored encrypted at rest and is never shown again — only the first and last
              characters appear afterwards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="api-key">API key</Label>
              <Input
                id="api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                placeholder="Paste the provider key"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="api-base">Endpoint</Label>
              <Input
                id="api-base"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.provider.co.za"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Select
                value={environment}
                onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button disabled={save.isPending || apiKey.trim().length < 8} onClick={() => save.mutate()}>
              Save key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
