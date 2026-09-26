import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { PageHeader, StageBadge } from "@/components/common";
import { Input } from "@/components/ui/input";
import { STAGES, getStage, isComplete } from "@/lib/domain/gates";
import { useAppState } from "@/lib/domain/store";
import { fmtDate, initials } from "@/lib/fmt";

export const Route = createFileRoute("/cases")({
  validateSearch: (s: Record<string, unknown>): { q?: string; stage?: string } => ({
    ...(typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {}),
    ...(typeof s["stage"] === "string" && s["stage"] ? { stage: s["stage"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "All Cases | indigro" },
      { name: "description", content: "Every advice case, from first contact to issued policy." },
      { property: "og:title", content: "All Cases | indigro" },
      { property: "og:description", content: "Every advice case in one searchable table." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CasesPage,
});

function CasesPage() {
  const s = useAppState();
  const { q = "", stage = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/cases" });
  const advisorName = (id: string) => s.advisors.find((a) => a.id === id)?.name ?? "Adviser";
  const rows = s.cases
    .filter((c) => {
      const t = `${c.code} ${c.clientName} ${advisorName(c.advisorId)}`.toLowerCase();
      if (q && !t.includes(q.toLowerCase())) return false;
      if (stage === "done") return isComplete(c);
      if (stage) return String(getStage(c)) === stage && !isComplete(c);
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader
        title="All Cases"
        description="Every case you have started, from first contact to issued policy."
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => void navigate({ search: (p) => ({ ...p, q: e.target.value }) })}
            placeholder="Search reference, client or adviser"
            className="pl-8"
            aria-label="Search cases"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => void navigate({ search: (p) => ({ ...p, stage: e.target.value }) })}
          className="h-9 rounded-md border bg-card px-2 text-sm"
          aria-label="Filter by stage"
        >
          <option value="">All stages</option>
          {STAGES.map((st) => (
            <option key={st.no} value={st.no}>
              {st.no} · {st.short}
            </option>
          ))}
          <option value="done">Complete</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-xs">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Reference</th>
              <th className="px-3 py-2 font-medium">Client</th>
              <th className="px-3 py-2 font-medium">Adviser</th>
              <th className="px-3 py-2 font-medium">Stage</th>
              <th className="px-3 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => (
              <tr
                key={c.id}
                tabIndex={0}
                onClick={() => void navigate({ to: "/workspace", search: { case: c.id } })}
                onKeyDown={(e) =>
                  e.key === "Enter" && void navigate({ to: "/workspace", search: { case: c.id } })
                }
                className="cursor-pointer hover:bg-muted/50"
              >
                <td className="px-3 py-2 font-mono">{c.code}</td>
                <td className="px-3 py-2 font-medium">{c.clientName}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {initials(advisorName(c.advisorId))} · {advisorName(c.advisorId)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <StageBadge c={c} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">{fmtDate(c.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  No cases match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
