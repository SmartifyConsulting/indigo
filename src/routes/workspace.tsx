import { createFileRoute } from "@tanstack/react-router";

import { LiveWorkspaceScreen } from "@/components/live-workspace";

export const Route = createFileRoute("/workspace")({
  validateSearch: (s: Record<string, unknown>): { case?: string } =>
    typeof s["case"] === "string" ? { case: s["case"] } : {},
  head: () => ({
    meta: [
      { title: "Live Workspace | indigro" },
      {
        name: "description",
        content: "Where every client is in the advice lifecycle, updated live.",
      },
      { property: "og:title", content: "Live Workspace | indigro" },
      { property: "og:description", content: "Where every client is in the advice lifecycle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LiveWorkspaceScreen,
});
