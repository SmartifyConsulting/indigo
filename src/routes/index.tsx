import { createFileRoute } from "@tanstack/react-router";

import {
  AdvisorDashboard,
  ClientDashboard,
  FspDashboard,
  InsurerDashboard,
} from "@/components/dashboards";
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

function Home() {
  const { session } = useAppState();
  switch (session.role) {
    case "advisor":
      return <AdvisorDashboard />;
    case "client":
      return <ClientDashboard />;
    case "fsp":
      return <FspDashboard />;
    case "insurer":
      return <InsurerDashboard />;
  }
}
