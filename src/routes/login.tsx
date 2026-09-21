import { createFileRoute, redirect } from "@tanstack/react-router";

/** The sign-in form lives on the home page. This route only keeps old links and bookmarks working. */
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/welcome", replace: true });
  },
});
