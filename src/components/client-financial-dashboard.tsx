import {
  ArrowRight,
  Bell,
  Calendar,
  ChevronRight,
  FileText,
  Heart,
  HelpCircle,
  Shield,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { PageHeader } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppState } from "@/lib/domain/store";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Data */

interface Product {
  title: string;
  sections: { title: string; rows: [string, string][] }[];
}

const PRODUCTS: Record<string, Product> = {
  life: {
    title: "Life Cover",
    sections: [
      {
        title: "Cover Details",
        rows: [
          ["Cover amount", "R3,000,000"],
          ["Monthly premium", "R1,245.00"],
          ["Policy number", "MER-LC-2019-04821"],
          ["Start date", "01 April 2019"],
          ["Next review", "12 June 2027"],
          ["Provider", "Meridian Life"],
        ],
      },
      {
        title: "Beneficiaries",
        rows: [
          ["Jane Adams", "70%"],
          ["John Adams", "30%"],
        ],
      },
      {
        title: "Key Exclusions",
        rows: [
          ["Suicide clause", "24-month waiting period"],
          ["Hazardous activities", "Standard exclusions apply"],
        ],
      },
      {
        title: "Documents",
        rows: [
          ["Policy schedule", "12 Sep 2026"],
          ["Benefit illustration", "12 Jun 2026"],
        ],
      },
    ],
  },
  income: {
    title: "Income Protection",
    sections: [
      {
        title: "Cover Details",
        rows: [
          ["Monthly benefit", "R45,000"],
          ["Waiting period", "30 days"],
          ["Benefit period", "To age 65"],
          ["Monthly premium", "R892.00"],
          ["Policy number", "MER-IP-2020-07293"],
          ["Start date", "01 August 2020"],
          ["Next review", "12 June 2027"],
        ],
      },
      {
        title: "Recent Claims",
        rows: [
          ["Current claim", "Medical assessment"],
          ["Submitted", "14 September 2026"],
        ],
      },
    ],
  },
  dread: {
    title: "Dread Disease Cover",
    sections: [
      {
        title: "Cover Details",
        rows: [
          ["Cover amount", "R1,500,000"],
          ["Monthly premium", "R678.00"],
          ["Policy number", "MER-DD-2019-04822"],
          ["Start date", "01 April 2019"],
          ["Next review", "12 June 2027"],
          ["Conditions covered", "28 defined conditions"],
        ],
      },
      {
        title: "Beneficiaries",
        rows: [["Policyholder", "100% (paid to you)"]],
      },
    ],
  },
  disability: {
    title: "Disability Cover",
    sections: [
      {
        title: "Cover Details",
        rows: [
          ["Cover amount", "R2,000,000"],
          ["Monthly premium", "R540.00"],
          ["Policy number", "MER-DC-2020-09114"],
          ["Start date", "01 August 2020"],
          ["Last reviewed", "03 February 2026"],
          ["Next review", "12 June 2027"],
        ],
      },
      {
        title: "Beneficiaries",
        rows: [["Policyholder", "100% (paid to you)"]],
      },
    ],
  },
  retire: {
    title: "Retirement Annuity",
    sections: [
      {
        title: "Fund Details",
        rows: [
          ["Current value", "R1,240,000"],
          ["Monthly contribution", "R7,000"],
          ["Fund", "Meridian Balanced Growth"],
          ["Policy number", "MER-RA-2018-01456"],
          ["Start date", "01 January 2018"],
          ["Target retirement", "Age 65"],
        ],
      },
      {
        title: "Performance",
        rows: [
          ["Return (12 months)", "+11.2%"],
          ["Return (since inception)", "+9.4% p.a."],
          ["Fees (TIC)", "1.15% p.a."],
        ],
      },
      {
        title: "Beneficiaries",
        rows: [["Jane Adams", "100%"]],
      },
    ],
  },
};

/* ---------------------------------------------------------------- Drawer */

function Drawer({
  productKey,
  onClose,
}: {
  productKey: string | null;
  onClose: () => void;
}) {
  const product = productKey ? PRODUCTS[productKey] : null;
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity",
          product ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-card shadow-xl transition-transform duration-300",
          product ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-base font-bold">{product?.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {product?.sections.map((s) => (
            <div key={s.title} className="mb-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.title}
              </p>
              {s.rows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between border-b border-border/50 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          ))}
          <Button className="mt-2 w-full">Contact us about this product</Button>
        </div>
      </div>
    </>
  );
}

/* ----------------------------------------------------------- Sub-components */

function FigureCell({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note: string;
}) {
  return (
    <div className="p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function ScenarioCard({
  label,
  value,
  desc,
  link,
  onClick,
}: {
  label: string;
  value: ReactNode;
  desc: string;
  link: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-lg border bg-secondary/50 p-5 text-left transition-colors hover:border-primary"
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-3 text-lg font-bold tabular-nums">{value}</p>
      <p className="mt-1 flex-1 text-xs text-muted-foreground">{desc}</p>
      <p className="mt-4 text-xs font-medium text-primary">{link}</p>
    </button>
  );
}

function StatusPill({ status }: { status: "active" | "review" | "action" }) {
  const v = status === "active" ? "success" : status === "review" ? "warning" : "danger";
  const t =
    status === "active"
      ? "Active"
      : status === "review"
        ? "Review recommended"
        : "Action required";
  return <Badge variant={v}>{t}</Badge>;
}

function GapCard({
  title,
  current,
  need,
  gapLabel,
  gapValue,
  pct,
  aligned,
}: {
  title: string;
  current: string;
  need: string;
  gapLabel: string;
  gapValue: string;
  pct: number;
  aligned?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="mb-4 text-sm font-semibold">{title}</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current</span>
            <span className="font-semibold tabular-nums">{current}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated need</span>
            <span className="font-semibold tabular-nums">{need}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{gapLabel}</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                aligned ? "text-positive" : "text-warning",
              )}
            >
              {gapValue}
            </span>
          </div>
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-border">
          <div
            className={cn("h-full rounded-full", aligned ? "bg-positive" : "bg-warning")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AttentionItem({
  title,
  desc,
  link,
  priority,
}: {
  title: string;
  desc: string;
  link: string;
  priority: "high" | "med";
}) {
  return (
    <div className="flex gap-3.5 rounded-lg border bg-card p-4 transition-colors hover:border-primary">
      <div
        className={cn(
          "mt-0.5 w-[3px] shrink-0 self-stretch rounded-full",
          priority === "high" ? "bg-warning" : "bg-primary",
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
        <p className="mt-2 text-xs font-medium text-primary">{link}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- Main Dashboard */

export function ClientFinancialDashboard() {
  const s = useAppState();
  const c = s.cases.find((x) => x.id === s.session.clientCaseId) ?? s.cases[0]!;
  const [drawerKey, setDrawerKey] = useState<string | null>(null);

  return (
    <>
      <Drawer productKey={drawerKey} onClose={() => setDrawerKey(null)} />

      <PageHeader
        title="Your Financial Protection"
        description="A clear view of what you're protected for, what you own and what needs your attention."
      />

      {/* Hero figures */}
      <div className="mb-8 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border lg:grid-cols-4">
        <FigureCell label="Life Cover" value="R3,000,000" note="If something happens to you" />
        <FigureCell
          label="Income Protection"
          value={
            <>
              R45,000<span className="text-sm font-medium text-muted-foreground"> /mo</span>
            </>
          }
          note="If you cannot work"
        />
        <FigureCell label="Dread Disease" value="R1,500,000" note="Covered conditions" />
        <FigureCell label="Investments" value="R2,090,000" note="Current value" />
      </div>

      {/* Scenarios */}
      <section className="mb-8">
        <h2 className="title-lg mb-4">If something happened to you</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ScenarioCard
            label="If I die"
            value="R3,000,000"
            desc="Estimated life cover payable"
            link="View cover →"
            onClick={() => setDrawerKey("life")}
          />
          <ScenarioCard
            label="If I can't work"
            value={
              <>
                R45,000<span className="text-sm font-medium text-muted-foreground"> /mo</span>
              </>
            }
            desc="Income protection benefit"
            link="View cover →"
            onClick={() => setDrawerKey("income")}
          />
          <ScenarioCard
            label="If I am diagnosed"
            value="R1,500,000"
            desc="Dread disease cover"
            link="View cover →"
            onClick={() => setDrawerKey("dread")}
          />
          <ScenarioCard
            label="When I retire"
            value="R1,240,000"
            desc="Current retirement savings"
            link="View retirement →"
            onClick={() => setDrawerKey("retire")}
          />
        </div>
      </section>

      {/* Protection table */}
      <section className="mb-8">
        <h2 className="title-lg mb-4">Your Protection</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">Protection</th>
                <th className="px-4 py-2.5">Current Cover</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Last Reviewed</th>
                <th className="px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(
                [
                  { name: "Life Cover", cover: "R3,000,000", status: "active" as const, date: "12 Jun 2026", key: "life" },
                  { name: "Income Protection", cover: "R45,000 /month", status: "active" as const, date: "12 Jun 2026", key: "income" },
                  { name: "Dread Disease", cover: "R1,500,000", status: "active" as const, date: "12 Jun 2026", key: "dread" },
                  { name: "Disability", cover: "R2,000,000", status: "review" as const, date: "03 Feb 2026", key: "disability" },
                ] as const
              ).map((r) => (
                <tr key={r.key} className="bg-card hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{r.cover}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDrawerKey(r.key)}
                      className="font-medium text-primary hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Protection position */}
      <section className="mb-8">
        <h2 className="title-lg mb-4">Your Protection Position</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <GapCard
            title="Life Cover"
            current="R3.0m"
            need="R3.5m"
            gapLabel="Potential gap"
            gapValue="R500k"
            pct={86}
          />
          <GapCard
            title="Income Protection"
            current="R45k /mo"
            need="R55k /mo"
            gapLabel="Potential gap"
            gapValue="R10k /mo"
            pct={82}
          />
          <GapCard
            title="Dread Disease"
            current="R1.5m"
            need="R1.5m"
            gapLabel="Position"
            gapValue="Aligned"
            pct={100}
            aligned
          />
        </div>
        <p className="mt-3 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
          These figures are illustrative only. Your estimated protection need is based on the
          information currently available to us. Review the assumptions before making changes to your
          cover.
        </p>
      </section>

      {/* My Wealth */}
      <section className="mb-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="title-lg">My Wealth</h2>
          <button type="button" className="text-sm font-medium text-primary hover:underline">
            View all investments →
          </button>
        </div>
        <div className="mb-3 flex items-baseline gap-4">
          <p className="text-3xl font-bold tabular-nums">R2,090,000</p>
          <p className="text-sm text-muted-foreground">Current total invested value</p>
        </div>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Retirement</p>
              <p className="mt-1 text-xl font-bold tabular-nums">R1,240,000</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Investments</p>
              <p className="mt-1 text-xl font-bold tabular-nums">R850,000</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border">
          <div className="bg-card p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Contributions YTD
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums">R84,000</p>
          </div>
          <div className="bg-card p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Investment Growth
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-positive">+R126,000</p>
          </div>
          <div className="bg-card p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fees YTD
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums">R14,200</p>
          </div>
        </div>
      </section>

      {/* Retirement + Beneficiaries */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Retirement */}
        <section>
          <h2 className="title-lg mb-4">My Retirement</h2>
          <Card>
            <CardContent className="p-5">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-lg font-bold text-brand-ink">
                  50
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Target retirement: 65</strong>
                  </p>
                  <p>
                    Current retirement savings:{" "}
                    <strong className="text-foreground">R1,240,000</strong>
                  </p>
                </div>
              </div>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full w-1/3 rounded-full bg-brand" />
              </div>
              <div className="mb-5 flex justify-between text-[11px] text-muted-foreground">
                <span>
                  Today · <strong className="text-foreground">50</strong>
                </span>
                <span>
                  Retirement · <strong className="text-foreground">65</strong>
                </span>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-secondary p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Est. Retirement Value
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums">R3.8m</p>
                </div>
                <div className="rounded-md bg-secondary p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Est. Monthly Income
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums">R24,500</p>
                </div>
              </div>
              <p className="mb-4 text-[11px] text-muted-foreground">
                Projection based on current assumptions and is not guaranteed.
              </p>
              <Button variant="outline" onClick={() => setDrawerKey("retire")}>
                Explore my retirement →
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Beneficiaries */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="title-lg">Your Beneficiaries</h2>
            <button type="button" className="text-sm font-medium text-primary hover:underline">
              Review beneficiaries →
            </button>
          </div>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Life Cover
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Jane Adams</span>
                    <span className="tabular-nums text-muted-foreground">70%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">John Adams</span>
                    <span className="tabular-nums text-muted-foreground">30%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Retirement Annuity
                </p>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Jane Adams</span>
                  <span className="tabular-nums text-muted-foreground">100%</span>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-warning">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Review recommended
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Things worth your attention */}
      <section className="mb-8">
        <h2 className="title-lg mb-4">Things worth your attention</h2>
        <div className="space-y-2">
          <AttentionItem
            title="Review your income protection"
            desc="Your current cover may not reflect your current income."
            link="Review cover →"
            priority="high"
          />
          <AttentionItem
            title="Beneficiary nomination"
            desc="Your retirement beneficiary details were last reviewed 3 years ago."
            link="Review beneficiaries →"
            priority="high"
          />
          <AttentionItem
            title="Retirement contribution"
            desc="Your monthly contribution has remained unchanged since January 2024."
            link="Review contribution →"
            priority="med"
          />
        </div>
      </section>

      {/* Coming Up + Claims */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="title-lg mb-4">Coming Up</h2>
          <div className="divide-y">
            {[
              { date: "1 Nov", text: "Premium review" },
              { date: "15 Nov", text: "Annual policy review" },
              { date: "30 Nov", text: "Investment statement available" },
            ].map((item) => (
              <div key={item.date} className="flex items-center gap-4 py-3">
                <span className="w-16 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {item.date}
                </span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="title-lg mb-4">Claims</h2>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-semibold">Income Protection Claim</p>
              <p className="mb-4 text-sm text-muted-foreground">Status: Medical assessment</p>
              <div className="flex items-center">
                {(
                  [
                    { label: "Submitted", state: "done" },
                    { label: "Documents", state: "done" },
                    { label: "Assessment", state: "current" },
                    { label: "Decision", state: "pending" },
                    { label: "Payment", state: "pending" },
                  ] as const
                ).map((step, i, arr) => (
                  <div key={step.label} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full border-2",
                          step.state === "done" && "border-positive bg-positive",
                          step.state === "current" &&
                            "border-brand bg-brand shadow-[0_0_0_3px_var(--brand-soft)]",
                          step.state === "pending" && "border-border bg-card",
                        )}
                      />
                      <span
                        className={cn(
                          "text-[10px]",
                          step.state === "pending"
                            ? "text-muted-foreground/60"
                            : "font-medium text-muted-foreground",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div
                        className={cn(
                          "mx-1 h-0.5 flex-1",
                          step.state === "done" ? "bg-positive" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Documents */}
      <section className="mb-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="title-lg">Recent Documents</h2>
          <button type="button" className="text-sm font-medium text-primary hover:underline">
            View all documents →
          </button>
        </div>
        <div className="divide-y">
          {[
            { name: "Policy Schedule", date: "12 Sep 2026" },
            { name: "Investment Statement", date: "01 Sep 2026" },
            { name: "Tax Certificate", date: "01 Jul 2026" },
            { name: "Premium Notice", date: "01 Jun 2026" },
          ].map((doc) => (
            <div
              key={doc.name}
              className="flex cursor-pointer items-center justify-between py-2.5 text-sm hover:text-primary"
            >
              <span className="font-medium">{doc.name}</span>
              <span className="tabular-nums text-muted-foreground">{doc.date}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Summary footer */}
      <Card>
        <CardContent className="p-5">
          <p className="mb-4 text-sm font-bold">Your Financial Protection at a Glance</p>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Protected
              </p>
              <p className="mt-0.5 text-base font-bold tabular-nums">R3.0m life cover</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Income
              </p>
              <p className="mt-0.5 text-base font-bold tabular-nums">R45k /mo protection</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Invested
              </p>
              <p className="mt-0.5 text-base font-bold tabular-nums">R2.09m</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Retirement
              </p>
              <p className="mt-0.5 text-base font-bold tabular-nums">R1.24m</p>
            </div>
          </div>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <span>Last reviewed: 12 June 2026</span>
            <span>Next review: 12 June 2027</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
