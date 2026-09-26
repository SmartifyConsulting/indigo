import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, Check, RotateCcw } from "lucide-react";

import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppState } from "@/lib/domain/store";
import type { LedgerEvent } from "@/lib/domain/types";
import { fmtDateTime } from "@/lib/fmt";
import { inbox, useInboxState } from "@/lib/inbox-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox | indigro" },
      { name: "description", content: "Updates on every case you are involved in." },
      { property: "og:title", content: "Inbox | indigro" },
      { property: "og:description", content: "Case updates with archive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const s = useAppState();
  const st = useInboxState();
  const visible = s.cases
    .filter((c) => {
      const r = s.session.role;
      if (r === "client") return c.id === s.session.clientCaseId;
      if (r === "insurer") return c.applications.some((a) => a.providerId === s.session.insurerId);
      if (r === "advisor") return c.advisorId === s.advisors[0]?.id;
      return true;
    })
    .map((c) => c.id);
  const items = s.ledger
    .filter((e) => e.caseId && visible.includes(e.caseId))
    .slice()
    .sort((a, b) => b.seq - a.seq)
    .slice(0, 100);
  const live = items.filter((e) => !st.archived.includes(e.seq));
  const archived = items.filter((e) => st.archived.includes(e.seq));

  const Row = ({ e, isArchived }: { e: LedgerEvent; isArchived: boolean }) => {
    const c = s.cases.find((x) => x.id === e.caseId);
    const unread = !st.read.includes(e.seq);
    return (
      <li className="flex items-start gap-3 py-3">
        <span
          aria-label={unread ? "Unread" : undefined}
          className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")}
        />
        <Link
          to="/workspace"
          search={{ case: e.caseId ?? undefined }}
          onClick={() => inbox.markRead(e.seq)}
          className="min-w-0 flex-1 hover:text-primary"
        >
          <p className="font-mono text-sm font-bold">{c?.code ?? "Case"}</p>
          <p className="text-xs">{e.summary}</p>
          <p className="text-[11px] text-muted-foreground">
            {c?.clientName} · {fmtDateTime(e.ts)}
          </p>
        </Link>
        <div className="flex shrink-0 gap-1">
          {unread && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => inbox.markRead(e.seq)}>
              <Check className="h-3.5 w-3.5" /> Mark read
            </Button>
          )}
          {isArchived ? (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => inbox.restore(e.seq)}>
              <RotateCcw className="h-3.5 w-3.5" /> Restore
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => inbox.archive(e.seq)}>
              <Archive className="h-3.5 w-3.5" /> Archive
            </Button>
          )}
        </div>
      </li>
    );
  };

  const List = ({ list, isArchived }: { list: LedgerEvent[]; isArchived: boolean }) =>
    list.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {isArchived ? "Nothing archived." : "You're all caught up."}
      </p>
    ) : (
      <ul className="divide-y rounded-lg border bg-card px-4">
        {list.map((e) => (
          <Row key={e.seq} e={e} isArchived={isArchived} />
        ))}
      </ul>
    );

  const unreadCount = live.filter((e) => !st.read.includes(e.seq)).length;
  return (
    <>
      <PageHeader title="Inbox" description="Updates on every case you are involved in." />
      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox{unreadCount > 0 && ` (${unreadCount})`}</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox">
          <List list={live} isArchived={false} />
        </TabsContent>
        <TabsContent value="archive">
          <List list={archived} isArchived />
        </TabsContent>
      </Tabs>
    </>
  );
}
