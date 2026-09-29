import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

import { PageHeader, RequireRole, StageBadge, StageDots, VerifiedBadge } from "@/components/common";
import { InviteClientDialog } from "@/components/invite-client-dialog";
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
import { getStage, isComplete } from "@/lib/domain/gates";
import { nextAction } from "@/lib/domain/next-action";
import { useAppState } from "@/lib/domain/store";
import { fmtDate } from "@/lib/fmt";

export const Route = createFileRoute("/clients/")({
  head: () => ({ meta: [{ title: "Clients | indigro" }] }),
  component: () => (
    <RequireRole roles={["advisor", "fsp"]}>
      <Clients />
    </RequireRole>
  ),
});

function Clients() {
  const s = useAppState();
  const navigate = useNavigate();
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
                    <span className="flex items-center gap-2">
                      <Link
                        to="/clients/$clientId"
                        params={{ clientId: c.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.clientName}
                      </Link>
                      <VerifiedBadge c={c} />
                    </span>
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
      <InviteClientDialog
        open={invite}
        onOpenChange={setInvite}
        doneLabel="Open client workspace"
        onDone={(id) => void navigate({ to: "/clients/$clientId", params: { clientId: id } })}
      />
    </>
  );
}
