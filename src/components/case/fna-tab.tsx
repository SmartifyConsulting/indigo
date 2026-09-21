import { Calculator } from "lucide-react";
import { useState } from "react";

import { Field, LockedBanner, toastResult } from "@/components/common";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { defaultFnaInputs } from "@/lib/domain/fna";
import { actions } from "@/lib/domain/store";
import type {
  CaseRecord,
  FnaInputs,
  MaritalStatus,
  NeedItem,
  RiskProfile,
} from "@/lib/domain/types";
import { fmtDateTime, zar } from "@/lib/fmt";

type NumKey = { [K in keyof FnaInputs]: FnaInputs[K] extends number ? K : never }[keyof FnaInputs];

const GROUPS: { title: string; fields: { key: NumKey; label: string; hint?: string }[] }[] = [
  {
    title: "Income and spending",
    fields: [
      { key: "grossAnnualIncome", label: "Gross annual income" },
      { key: "monthlyExpenses", label: "Household expenses (monthly)" },
      { key: "dependants", label: "Dependants" },
      { key: "youngestDependantAge", label: "Youngest dependant's age" },
    ],
  },
  {
    title: "Liabilities and assets",
    fields: [
      { key: "bond", label: "Home loan outstanding" },
      { key: "otherDebts", label: "Other debts" },
      { key: "liquidAssets", label: "Cash and liquid assets" },
      { key: "investmentAssets", label: "Discretionary investments" },
      { key: "propertyValue", label: "Property value" },
      { key: "offshorePct", label: "Offshore share of investments (%)" },
    ],
  },
  {
    title: "Retirement",
    fields: [
      { key: "retirementFundValue", label: "Retirement fund value" },
      { key: "monthlyRetirementSaving", label: "Monthly retirement contribution" },
    ],
  },
  {
    title: "Existing life and risk cover",
    fields: [
      { key: "existingLifeCover", label: "Life cover" },
      { key: "existingIncomeProtection", label: "Income protection (monthly benefit)" },
      { key: "existingSevereIllness", label: "Severe illness cover" },
    ],
  },
  {
    title: "Short-term assets and cover",
    fields: [
      { key: "vehicleValue", label: "Vehicle value" },
      { key: "existingVehicleCover", label: "Vehicle cover" },
      { key: "buildingValue", label: "Buildings replacement value" },
      { key: "existingBuildingCover", label: "Buildings cover" },
      { key: "contentsValue", label: "Contents value" },
      { key: "existingContentsCover", label: "Contents cover" },
      { key: "pets", label: "Pets" },
      { key: "existingPetCover", label: "Pet cover" },
    ],
  },
];

export function NeedsTable({ needs }: { needs: NeedItem[] }) {
  const cats = [
    { id: "life", title: "Life and risk" },
    { id: "short-term", title: "Short-term" },
    { id: "investment", title: "Investments and wealth" },
  ] as const;
  return (
    <div className="space-y-6">
      {cats.map((cat) => (
        <div key={cat.id}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {cat.title}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Need</TableHead>
                <TableHead className="text-right">Required</TableHead>
                <TableHead className="text-right">Existing</TableHead>
                <TableHead className="text-right">Gap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {needs
                .filter((n) => n.category === cat.id)
                .map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <p className="font-medium">{n.label}</p>
                      <p className="max-w-lg text-xs text-muted-foreground">{n.rationale}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {zar(n.required)}
                      {n.unit === "monthly" && (
                        <span className="text-xs text-muted-foreground"> p/m</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{zar(n.current)}</TableCell>
                    <TableCell className="text-right">
                      {n.gap > 0 ? (
                        <Badge variant="warning">{zar(n.gap)}</Badge>
                      ) : (
                        <Badge variant="success">Covered</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

export function FnaTab({ c }: { c: CaseRecord }) {
  const [inputs, setInputs] = useState<FnaInputs>(c.fna.inputs ?? defaultFnaInputs());
  const set = <K extends keyof FnaInputs>(k: K, v: FnaInputs[K]) =>
    setInputs((p) => ({ ...p, [k]: v }));
  const result = c.fna.result;

  if (c.fnaMode === "single-need") {
    return (
      <LockedBanner>
        <p className="font-medium">No full needs analysis for this client</p>
        <p className="mt-0.5">
          The client chose a single need and signed the disclaimer, so the analysis is skipped and
          only that need goes to the insurers.
        </p>
      </LockedBanner>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Client facts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Marital status">
                <Select
                  value={inputs.maritalStatus}
                  onValueChange={(v) => set("maritalStatus", v as MaritalStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["single", "married", "divorced", "widowed"] as const).map((m) => (
                      <SelectItem key={m} value={m} className="capitalize">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Risk profile (questionnaire result)">
                <Select
                  value={inputs.riskProfile}
                  onValueChange={(v) => set("riskProfile", v as RiskProfile)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["conservative", "moderate", "aggressive"] as const).map((m) => (
                      <SelectItem key={m} value={m} className="capitalize">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Runs a business">
                <div className="flex h-10 items-center gap-3">
                  <Switch
                    checked={inputs.hasBusiness}
                    onCheckedChange={(v) => set("hasBusiness", v)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {inputs.hasBusiness ? "Yes" : "No"}
                  </span>
                </div>
              </Field>
            </div>
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {g.title}
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {g.fields.map((f) => (
                    <Field key={f.key} label={f.label}>
                      <Input
                        type="number"
                        min={0}
                        value={inputs[f.key]}
                        onChange={(e) => set(f.key, Number(e.target.value))}
                      />
                    </Field>
                  ))}
                </div>
              </div>
            ))}
            {inputs.hasBusiness && (
              <Field label="Existing business liability cover">
                <Input
                  className="max-w-xs"
                  type="number"
                  min={0}
                  value={inputs.existingBusinessLiability}
                  onChange={(e) => set("existingBusinessLiability", Number(e.target.value))}
                />
              </Field>
            )}
            <div className="flex items-center gap-3">
              <Button
                onClick={() =>
                  toastResult(actions.saveFna(c.id, inputs), "Needs analysis calculated")
                }
              >
                <Calculator /> {result ? "Recalculate" : "Run needs analysis"}
              </Button>
              {result && (
                <span className="text-xs text-muted-foreground">
                  Last run {fmtDateTime(result.computedAt)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Results: cover gaps</CardTitle>
            </CardHeader>
            <CardContent>
              <NeedsTable needs={result.needs} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        {result ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Estate duty estimate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(
                  [
                    ["Gross estate", result.estate.grossEstate],
                    ["Less liabilities", -result.estate.liabilities],
                    ["Less funeral and executor costs", -result.estate.costs],
                    ["Dutiable estate", result.estate.dutiable],
                    ["Less abatement", -result.estate.abatement],
                    ["Taxable amount", result.estate.taxable],
                  ] as const
                ).map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{l}</span>
                    <span>{zar(v)}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-2 border-t pt-2 font-medium">
                  <span>Estimated estate duty</span>
                  <span>{zar(result.estate.duty)}</span>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">{result.estate.note}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Assumptions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {result.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Same inputs always give the same result, so advice does not depend on the
                  individual advisor.
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              Run the analysis to see cover gaps across life, short-term and investments, plus an
              estate duty estimate.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
