import { createFileRoute } from "@tanstack/react-router";

import { OnDarkContext, PageHeader } from "@/components/common";
import { LifecycleDiagram } from "@/components/lifecycle-diagram";
import { lifecycleView } from "@/lib/domain/lifecycle";
import { useAppState } from "@/lib/domain/store";

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
  component: LiveWorkspace,
});

function LiveWorkspace() {
  const state = useAppState();
  const view = lifecycleView(state);
  return (
    <OnDarkContext.Provider value>
      <PageHeader
        title="Live Workspace"
        description="Where every client is in the advice lifecycle, updated live."
      />
      <LifecycleDiagram chips={view.chips} active={view.active} heading={false} />
    </OnDarkContext.Provider>
  );
}
