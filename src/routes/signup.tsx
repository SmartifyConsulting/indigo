import { createFileRoute, redirect } from "@tanstack/react-router";

/** Create account lives on the home page. This route only keeps old links and bookmarks working. */
export const Route = createFileRoute("/signup")({
  beforeLoad: () => {
    throw redirect({ to: "/welcome", search: { tab: "signup" }, replace: true });
  },
});
