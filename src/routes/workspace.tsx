import { createFileRoute } from "@tanstack/react-router";

import { LiveWorkspaceScreen } from "@/components/live-workspace";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Live Workspace | indigro" },
      {
        name: "description",
        content: "Where every client is in the advice lifecycle, updated live.",
      },
    ],
  }),
  component: LiveWorkspaceScreen,
});
