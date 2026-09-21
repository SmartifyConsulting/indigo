import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, TrendingUp, Users, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  activity,
  allocation,
  clients,
  compactCurrency,
  performance,
  summary,
} from "@/lib/wealth-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — indio Wealth Management" },
      {
        name: "description",
        content:
          "Assets under management, net flows, allocation and recent client activity at a glance.",
      },
      { property: "og:title", content: "Dashboard — indio Wealth Management" },
      {
        property: "og:description",
        content: "Assets under management, net flows, allocation and recent client activity.",
      },
    ],
  }),
  component: Dashboard,
});

function Stat({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  icon: typeof Wallet;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-foreground">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="wordmark mt-4 text-3xl text-foreground">{value}</p>
        <p className="mt-1 text-xs font-medium text-positive">{change}</p>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const topClients = [...clients].sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="wordmark text-2xl text-foreground">good afternoon, erin</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Book overview as at 21 September 2026.
          </p>
        </div>
        <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
          New client review
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Assets under management" value={compactCurrency(summary.aum)} change="+2.7% this month" icon={Wallet} />
        <Stat label="Active clients" value={String(summary.clients)} change="+6 this quarter" icon={Users} />
        <Stat label="Net flows YTD" value={compactCurrency(summary.netFlows)} change="+R 12.4m vs last year" icon={TrendingUp} />
        <Stat label="Blended return" value="9.4%" change="Benchmark +1.2%" icon={ArrowUpRight} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Book value (R millions)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performance} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="bookFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" domain={["dataMin - 100", "dataMax + 80"]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    color: "var(--color-foreground)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-brand)"
                  strokeWidth={2.5}
                  fill="url(#bookFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Asset allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {allocation.map((a) => (
              <div key={a.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-foreground">{a.label}</span>
                  <span className="text-muted-foreground">{a.weight}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-brand" style={{ width: `${a.weight}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{compactCurrency(a.value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Largest relationships</CardTitle>
            <Link to="/clients" className="text-xs font-medium text-brand-foreground underline-offset-4 hover:underline">
              View all clients
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="divide-y divide-border">
              {topClients.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: c.id }}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-brand-foreground"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.segment} · {c.adviser}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{compactCurrency(c.value)}</p>
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {c.risk}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="space-y-4">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.what}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.who} · {a.when}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
