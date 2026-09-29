import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

import { useOrigin } from "@/components/case/onboarding-tab";
import {
  Field,
  PageHeader,
  RequireRole,
  StageBadge,
  StageDots,
  toastResult,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStage, isComplete } from "@/lib/domain/gates";
import { nextAction } from "@/lib/domain/next-action";
import { actions, useAppState } from "@/lib/domain/store";
import { fmtDate } from "@/lib/fmt";

export const Route = createFileRoute("/clients/")({
  head: () => ({ meta: [{ title: "Clients | indigro" }] }),
  component: () => (
    <RequireRole roles={["advisor", "fsp"]}>
      <Clients />
    </RequireRole>
  ),
});

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const s = useAppState();
  const navigate = useNavigate();
  const origin = useOrigin();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);
  const link = created ? `${origin}/onboard/${created.code}` : "";

  const create = () => {
    const r = actions.createCase({ ...form, advisorId: s.advisors[0]!.id });
    if (toastResult(r, "Invitation created") && r.ok && "caseId" in r)
      setCreated({ id: r.caseId, code: r.code });
  };
  const close = (o: boolean) => {
    if (!o) {
      setCreated(null);
      setForm({ name: "", email: "", phone: "" });
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{created ? "Share the client gateway" : "Invite a client"}</DialogTitle>
          <DialogDescription>
            {created
              ? "The client scans the QR code or opens the secure link to verify their identity and sign their mandates."
              : "Creates the client record and a unique onboarding link."}
          </DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-md border bg-white p-3">
              <QRCodeSVG value={link} size={160} />
            </div>
            <code className="w-full truncate rounded-md border bg-background px-3 py-2 text-xs">
              {link}
            </code>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Full name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="As on their ID"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Mobile">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
        )}
        <DialogFooter>
          {created ? (
            <Button
              onClick={() => {
                close(false);
                void navigate({ to: "/clients/$clientId", params: { clientId: created.id } });
              }}
            >
              Open client workspace
            </Button>
          ) : (
            <Button onClick={create} disabled={form.name.trim().length < 3}>
              Create invitation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Clients() {
  const s = useAppState();
  const [q, setQ] = useState("");
  const [invite, setInvite] = useState(false);
  const isAdvisor = s.session.role === "advisor";
  const me = s.advisors[0]!;
  const rows = s.cases
    .filter((c) => (isAdvisor ? c.advisorId === me.id : true))
    .filter((c) => c.clientName.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        title={isAdvisor ? "Clients" : "Client Pipeline"}
        description={
          isAdvisor
            ? "Every client moves through the same six regulated stages."
            : `All advisors at ${s.fsp.name}`
        }
        actions={
          isAdvisor && (
            <Button onClick={() => setInvite(true)}>
              <Plus /> Invite client
            </Button>
          )
        }
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search clients"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search clients"
        />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              {!isAdvisor && <TableHead>Advisor</TableHead>}
              <TableHead>Stage</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Next step</TableHead>
              <TableHead>Invited</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const na = nextAction(c);
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: c.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.clientName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </TableCell>
                  {!isAdvisor && (
                    <TableCell>{s.advisors.find((a) => a.id === c.advisorId)?.name}</TableCell>
                  )}
                  <TableCell>
                    <StageBadge c={c} />
                  </TableCell>
                  <TableCell>
                    <StageDots stage={getStage(c)} complete={isComplete(c)} />
                  </TableCell>
                  <TableCell className="max-w-64 text-sm">
                    {na.text}
                    {na.owner !== "none" && (
                      <span className="block text-xs capitalize text-muted-foreground">
                        {na.owner === "fsp" ? "Key Individual" : na.owner}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(c.createdAt)}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No clients match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <InviteDialog open={invite} onOpenChange={setInvite} />
    </>
  );
}
