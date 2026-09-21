import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Field, PageHeader, RequireRole, StatCard } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/domain/store";
import { zar } from "@/lib/fmt";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing | indigro" }] }),
  component: () => (
    <RequireRole roles={["fsp"]}>
      <Billing />
    </RequireRole>
  ),
});

function Billing() {
  const s = useAppState();
  const active = s.advisors.filter((a) => a.active);
  // Illustrative rates only: replace with the agreed commercial terms.
  const [base, setBase] = useState(9_500);
  const [seat, setSeat] = useState(1_250);
  const total = base + seat * active.length;

  return (
    <>
      <PageHeader
        title="Billing"
        description={`Hybrid SaaS plan for ${s.fsp.name}, billed to the FSP.`}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Platform fee" value={zar(base)} hint="Per month, billed to the FSP" />
        <StatCard
          label="Active advisor seats"
          value={active.length}
          hint={`${zar(seat)} per seat per month`}
        />
        <StatCard label="Monthly total" value={zar(total)} hint="Excl. VAT" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Included in each part</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Platform fee (FSP)</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>GRC control engine and compliance dashboard</li>
                <li>Key Individual oversight tools</li>
                <li>Immutable audit ledger and regulator exports</li>
                <li>Unlimited compliance and admin users</li>
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Seat fee (per active advisor)</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Multi-insurer quoting and ROA generation</li>
                <li>CRM integrations (Salesforce, HubSpot)</li>
                <li>Client portal and onboarding gateway</li>
                <li>Astute portfolio retrieval</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Platform fee (R / month)">
              <Input type="number" value={base} onChange={(e) => setBase(Number(e.target.value))} />
            </Field>
            <Field label="Seat fee (R / advisor / month)">
              <Input type="number" value={seat} onChange={(e) => setSeat(Number(e.target.value))} />
            </Field>
            <p className="text-xs text-muted-foreground">
              Illustrative rates for modelling. Replace with the agreed commercial terms.
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Seats</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {s.advisors.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.title} · {a.fsNumber}
                  </p>
                </div>
                {a.active ? (
                  <Badge variant="success">{zar(seat)}</Badge>
                ) : (
                  <Badge variant="secondary">Inactive, not billed</Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
