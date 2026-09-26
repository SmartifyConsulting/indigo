import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Plug } from "lucide-react";

import { PageHeader } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: `Admin | ${BRAND.name}` },
      {
        name: "description",
        content: "Platform integrations and API credentials for administrators.",
      },
    ],
  }),
  component: AdminHub,
});

const LINKS = [
  {
    to: "/integrations" as const,
    label: "Integrations",
    description: "Two-way CRM sync, Astute portfolio retrieval, insurer quoting APIs and identity verification.",
    icon: Plug,
  },
  {
    to: "/admin/integrations" as const,
    label: "APIs and credentials",
    description: "Store and rotate provider API keys, check connections and review call history.",
    icon: KeyRound,
  },
];

function AdminHub() {
  return (
    <>
      <PageHeader title="Admin" description="Everything that manages how indigro connects to the outside world." />
      <div className="grid gap-4 sm:grid-cols-2">
        {LINKS.map(({ to, label, description, icon: Icon }) => (
          <Link key={to} to={to} className="block">
            <Card className="h-full transition-colors hover:border-brand">
              <CardContent className="flex items-start gap-3 p-5">
                <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
