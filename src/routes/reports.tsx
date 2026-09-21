import { createFileRoute } from "@tanstack/react-router";
import { Download, FileBarChart, FileSpreadsheet, FileText, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { documents } from "@/lib/wealth-data";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & documents — indio Wealth Management" },
      {
        name: "description",
        content: "Client statements, tax packs, mandates and compliance documents in one library.",
      },
      { property: "og:title", content: "Reports & documents — indio Wealth Management" },
      {
        property: "og:description",
        content: "Client statements, tax packs, mandates and compliance documents in one library.",
      },
    ],
  }),
  component: ReportsPage,
});

const shortcuts = [
  { label: "Portfolio statement", hint: "Per client, any period", icon: FileBarChart },
  { label: "Performance pack", hint: "Benchmark comparison", icon: FileSpreadsheet },
  { label: "Compliance review", hint: "KYC and mandate status", icon: ShieldCheck },
];

function ReportsPage() {
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () =>
      documents.filter((d) =>
        `${d.title} ${d.client} ${d.type}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="wordmark text-2xl text-foreground">reports &amp; documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate new reporting or download an existing document.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {shortcuts.map(({ label, hint, icon: Icon }) => (
          <Card key={label} className="transition-colors hover:border-brand/60">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-brand-foreground">
                Generate
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents"
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {d.title}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-medium">
                      {d.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{d.client}</TableCell>
                  <TableCell className="text-muted-foreground">{d.date}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{d.size}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" aria-label={`Download ${d.title}`}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No documents found.
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
