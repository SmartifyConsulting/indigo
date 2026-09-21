import { Check, FileText, Send } from "lucide-react";
import { useState } from "react";

import { GateList, toastResult } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { latestRoa, quoteGates, roaSigned } from "@/lib/domain/gates";
import { needLabel } from "@/lib/domain/quotes";
import { actions } from "@/lib/domain/store";
import {
  providerName,
  type CaseRecord,
  type NeedId,
  type Quote,
  type RoaContent,
} from "@/lib/domain/types";
import { fmtDateTime, zar } from "@/lib/fmt";
import { cn } from "@/lib/utils";

const AFFORD_VARIANT = {
  comfortable: "success",
  stretched: "warning",
  unaffordable: "danger",
} as const;

export function RoaSummary({ content }: { content: RoaContent }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Client: </span>
          {content.clientName}
        </p>
        <p>
          <span className="text-muted-foreground">Advisor: </span>
          {content.advisor}
        </p>
        <p className="sm:col-span-2">
          <span className="text-muted-foreground">FSP: </span>
          {content.fspName}
        </p>
        <p>
          <span className="text-muted-foreground">Basis of advice: </span>
          {content.fnaMode === "full" ? "Full needs analysis" : "Single need (disclaimer signed)"}
        </p>
        <p className="capitalize">
          <span className="text-muted-foreground">Risk profile: </span>
          {content.riskProfile}
        </p>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recommended products
        </p>
        <ul className="divide-y rounded-md border">
          {content.recommendations.map((r) => (
            <li key={r.quoteId} className="flex flex-wrap justify-between gap-2 px-3 py-2">
              <span>
                {r.product} <span className="text-muted-foreground">({r.provider})</span>
              </span>
              <span>
                {zar(r.cover)}
                {r.unit === "monthly" ? " p/m benefit" : " cover"} ·{" "}
                <strong>{zar(r.monthlyPremium)} p/m</strong>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>
          Total <strong>{zar(content.totalMonthlyPremium)}</strong> a month is{" "}
          {content.affordabilityPct}% of net income
        </span>
        <Badge variant={AFFORD_VARIANT[content.affordability]} className="capitalize">
          {content.affordability}
        </Badge>
      </div>
      <p className="whitespace-pre-wrap rounded-md border bg-background p-3">
        {content.commentary || "No advisor commentary yet."}
      </p>
    </div>
  );
}

function QuoteCard({
  q,
  selected,
  onPick,
  cheapest,
}: {
  q: Quote;
  selected: boolean;
  onPick: () => void;
  cheapest: boolean;
}) {
  return (
    <button
      onClick={onPick}
      className={cn(
        "flex flex-col rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary",
        selected && "border-primary bg-primary-soft",
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{providerName(q.providerId)}</p>
          <p className="text-xs text-muted-foreground">{q.product}</p>
        </div>
        {selected ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </span>
        ) : (
          cheapest && <Badge variant="success">Lowest</Badge>
        )}
      </div>
      <p className="title-lg mt-3">
        {zar(q.monthlyPremium)}{" "}
        <span className="text-xs font-normal text-muted-foreground">p/m</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {zar(q.cover)} {q.unit === "monthly" ? "monthly benefit" : "cover"}
      </p>
      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        {q.features.map((f) => (
          <li key={f}>· {f}</li>
        ))}
      </ul>
      {q.underwriting === "medical" && (
        <Badge variant="warning" className="mt-3 w-fit">
          Medical underwriting
        </Badge>
      )}
    </button>
  );
}

function NeedQuotes({ c, needId }: { c: CaseRecord; needId: NeedId }) {
  const [all, setAll] = useState(false);
  const ranked = c.quotes.items
    .filter((q) => q.needId === needId)
    .sort((a, b) => a.monthlyPremium - b.monthlyPremium);
  const shown = all ? ranked : ranked.slice(0, 3);
  const locked = c.applications.length > 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">{needLabel(needId)}</p>
        {ranked.length > 3 && (
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setAll((v) => !v)}>
            {all ? "Show top 3" : `Show all ${ranked.length}`}
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {shown.map((q) => (
          <QuoteCard
            key={q.id}
            q={q}
            selected={c.quotes.selectedIds.includes(q.id)}
            cheapest={q.id === ranked[0]?.id}
            onPick={() => !locked && actions.toggleQuote(c.id, q.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function QuotesTab({ c }: { c: CaseRecord }) {
  const gates = quoteGates(c);
  const roa = latestRoa(c);
  const needIds = [...new Set(c.quotes.items.map((q) => q.needId))];
  const [commentary, setCommentary] = useState(c.quotes.commentary);
  const locked = c.applications.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {c.quotes.items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Multi-insurer quotes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sends the structured client data to Momentum, Discovery, Old Mutual, Sanlam, Santam
                and Auto &amp; General and returns side-by-side quotes for every quotable gap.
              </p>
              <GateList gates={gates} title="Required before quotes" />
              <Button
                onClick={() =>
                  toastResult(actions.requestQuotes(c.id), "Quotes received from insurers")
                }
              >
                <Send /> Request quotes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Compare and select</CardTitle>
              <p className="text-sm text-muted-foreground">
                Top three per need, ranked by premium. Pick one option per need. Every change
                creates a new Record of Advice version that the client must sign again.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {needIds.map((n) => (
                <NeedQuotes key={n} c={c} needId={n} />
              ))}
            </CardContent>
          </Card>
        )}

        {c.quotes.selectedIds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Advisor commentary and affordability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={4}
                value={commentary}
                disabled={locked}
                onChange={(e) => {
                  setCommentary(e.target.value);
                  actions.setCommentary(c.id, e.target.value);
                }}
                onBlur={() => actions.commitCommentary(c.id)}
                placeholder="Explain why these products meet the client's needs, and how the premiums fit their budget (min. 20 characters)."
              />
              <p className="text-xs text-muted-foreground">
                Saved to the ROA when you leave the field.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Record of Advice
            </CardTitle>
            {roa && (
              <Badge variant={roaSigned(c) ? "success" : "warning"}>
                {roaSigned(c) ? `v${roa.version} signed` : `v${roa.version} awaiting signature`}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {roa ? (
              <div className="space-y-4">
                <RoaSummary content={roa.content} />
                <div className="border-t pt-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Version history
                  </p>
                  <ul className="space-y-1 text-xs">
                    {[...c.roa].reverse().map((v) => {
                      const signed = c.signatures.some(
                        (s) => s.kind === "roa" && s.roaVersion === v.version,
                      );
                      return (
                        <li key={v.version} className="flex justify-between gap-2">
                          <span>
                            v{v.version} · {fmtDateTime(v.createdAt)}
                          </span>
                          <span className="text-muted-foreground">
                            {signed
                              ? "signed"
                              : v.version === roa.version
                                ? "current, unsigned"
                                : "superseded"}{" "}
                            · {v.hash.slice(0, 8)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select at least one quote and the ROA is generated automatically, mapping each need
                to the recommended policy.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
