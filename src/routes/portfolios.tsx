import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { compactCurrency, currency, portfolios } from "@/lib/wealth-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portfolios")({
  head: () => ({
    meta: [
      { title: "Portfolios — indio Wealth Management" },
      {
        name: "description",
        content: "Mandates, positions and performance across managed portfolios.",
      },
      { property: "og:title", content: "Portfolios — indio Wealth Management" },
      {
        property: "og:description",
        content: "Mandates, positions and performance across managed portfolios.",
      },
    ],
  }),
  component: PortfoliosPage,
});

function PortfoliosPage() {
  const [selectedId, setSelectedId] = useState(portfolios[0]!.id);
  const selected = portfolios.find((p) => p.id === selectedId) ?? portfolios[0]!;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="wordmark text-2xl text-foreground">portfolios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {portfolios.length} mandates under management
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {portfolios.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={cn(
                "w-full rounded-xl border bg-card p-4 text-left transition-colors",
                p.id === selected.id
                  ? "border-brand ring-1 ring-brand"
                  : "border-border hover:border-brand/50",
              )}
            >
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.clientName}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-semibold">{compactCurrency(p.value)}</span>
                <Badge className="border-0 bg-brand-soft font-medium text-brand-foreground">
                  +{p.ytd}% YTD
                </Badge>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Market value", value: compactCurrency(selected.value) },
              { label: "Return YTD", value: `+${selected.ytd}%` },
              { label: "Cash weight", value: `${selected.cash}%` },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="wordmark mt-3 text-2xl text-foreground">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Positions — {selected.mandate}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Instrument</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Gain / loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.holdings.map((h) => (
                    <TableRow key={h.ticker}>
                      <TableCell className="font-medium">
                        {h.instrument}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {h.ticker}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {h.units.toLocaleString("en-ZA")}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {currency(h.price, 2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {compactCurrency(h.value)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {h.weight}%
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          h.gain >= 0 ? "text-positive" : "text-negative",
                        )}
                      >
                        {h.gain >= 0 ? "+" : ""}
                        {h.gain}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
