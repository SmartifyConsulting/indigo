import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { clients, compactCurrency, type Client } from "@/lib/wealth-data";

export const Route = createFileRoute("/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — indio Wealth Management" },
      {
        name: "description",
        content: "Search and filter the client book by segment, adviser, value and status.",
      },
      { property: "og:title", content: "Clients — indio Wealth Management" },
      {
        property: "og:description",
        content: "Search and filter the client book by segment, adviser, value and status.",
      },
    ],
  }),
  component: ClientsPage,
});

const statusTone: Record<Client["status"], string> = {
  Active: "bg-brand-soft text-brand-foreground",
  Onboarding: "bg-secondary text-secondary-foreground",
  "Review due": "bg-destructive/10 text-destructive",
  Dormant: "bg-muted text-muted-foreground",
};

function ClientsPage() {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("all");

  const rows = useMemo(
    () =>
      clients.filter((c) => {
        const matchesQuery = `${c.name} ${c.adviser} ${c.location}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesSegment = segment === "all" || c.segment === segment;
        return matchesQuery && matchesSegment;
      }),
    [query, segment],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="wordmark text-2xl text-foreground">client book</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} of {clients.length} relationships
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, adviser, city"
              className="pl-9"
            />
          </div>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All segments</SelectItem>
              <SelectItem value="Private Client">Private Client</SelectItem>
              <SelectItem value="Family Office">Family Office</SelectItem>
              <SelectItem value="Institutional">Institutional</SelectItem>
              <SelectItem value="Retail">Retail</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Client</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Portfolio value</TableHead>
                <TableHead>Adviser</TableHead>
                <TableHead>Last review</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: c.id }}
                      className="block hover:text-brand-foreground"
                    >
                      {c.name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {c.location}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.segment}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {compactCurrency(c.value)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.adviser}</TableCell>
                  <TableCell className="text-muted-foreground">{c.lastReview}</TableCell>
                  <TableCell>
                    <Badge className={`${statusTone[c.status]} border-0 font-medium`}>
                      {c.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No clients match that search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
