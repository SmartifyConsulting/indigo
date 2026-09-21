import { createFileRoute } from "@tanstack/react-router";

import {
  AdvisorDashboard,
  ClientDashboard,
  FspDashboard,
  InsurerDashboard,
} from "@/components/dashboards";
import { LifecycleDiagram } from "@/components/lifecycle-diagram";
import { lifecycleView } from "@/lib/domain/lifecycle";
import { useAppState } from "@/lib/domain/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | indigro" },
      {
        name: "description",
        content: "Pipeline, compliance status and next actions across the advice lifecycle.",
      },
    ],
  }),
  component: Home,
});

function RoleDashboard({ role }: { role: string }) {
  switch (role) {
    case "client":
      return <ClientDashboard />;
    case "fsp":
      return <FspDashboard />;
    case "insurer":
      return <InsurerDashboard />;
    default:
      return <AdvisorDashboard />;
  }
}

function Home() {
  const state = useAppState();
  const view = lifecycleView(state);
  return (
    <>
      <LifecycleDiagram chips={view.chips} active={view.active} />
      <RoleDashboard role={state.session.role} />
    </>
  );
}
