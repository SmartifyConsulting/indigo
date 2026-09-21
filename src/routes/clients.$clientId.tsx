import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { compactCurrency, currency, getClient, getPortfoliosForClient, portfolios } from "@/lib/wealth-data";

export const Route = createFileRoute("/clients/$clientId")({
  loader: ({ params }) => {
    const client = getClient(params.clientId);
    if (!client) throw notFound();
    return { client };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Client not found — indio" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.client.name} — indio Wealth Management`;
    const description = `${loaderData.client.segment} relationship managed by ${loaderData.client.adviser}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ClientDetail,
});

const timeline = [
  { id: "t1", date: "19 Sep 2026", text: "Annual review completed — mandate unchanged." },
  { id: "t2", date: "02 Aug 2026", text: "Offshore allocation increased by 4%." },
  { id: "t3", date: "14 May 2026", text: "Beneficiary details updated on the trust." },
  { id: "t4", date: "11 Feb 2026", text: "Contribution of R 12m received." },
];

function ClientDetail() {
  const { client } = Route.useLoaderData();
  const owned = getPortfoliosForClient(client.id);
  const shown = owned.length > 0 ? owned : portfolios.slice(0, 1);
  const initials = client.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="space-y-6">
      <Link
        to="/clients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-[220px] flex-1">
            <h2 className="wordmark text-2xl text-foreground">{client.name}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className="border-0 bg-brand-soft font-medium text-brand-foreground">
                {client.segment}
              </Badge>
              <Badge variant="secondary">{client.risk} risk</Badge>
              <Badge variant="outline">Client since {client.since}</Badge>
            </div>
          </div>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> {client.email}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> {client.phone}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {client.location}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Total value
            </p>
            <p className="wordmark text-3xl text-foreground">{compactCurrency(client.value)}</p>
            <Button className="mt-3 bg-brand text-brand-foreground hover:bg-brand/90">
              Schedule review
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="holdings">
        <TabsList>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="notes">Notes & activity</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Instrument</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Gain</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown[0]!.holdings.map((h) => (
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
                      <TableCell className="text-right text-muted-foreground">{h.weight}%</TableCell>
                      <TableCell
                        className={`text-right font-medium ${h.gain >= 0 ? "text-positive" : "text-negative"}`}
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
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {shown.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 text-sm">
                  <p className="text-muted-foreground">{p.mandate}</p>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-semibold">{compactCurrency(p.value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Return YTD</span>
                    <span className="font-semibold text-positive">+{p.ytd}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash weight</span>
                    <span className="font-semibold">{p.cash}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <ul className="space-y-5">
                {timeline.map((t) => (
                  <li key={t.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                      <span className="mt-1 w-px flex-1 bg-border" />
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium text-foreground">{t.text}</p>
                      <p className="text-xs text-muted-foreground">{t.date}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
