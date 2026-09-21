import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "@/components/brand/logo";
import { LifecycleDiagram } from "@/components/lifecycle-diagram";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: `${BRAND.name}: from first scan to annual review` },
      { name: "description", content: BRAND.tagline },
      { property: "og:title", content: `${BRAND.name}: from first scan to annual review` },
      { property: "og:description", content: BRAND.tagline },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { session } = useAuth();
  const signedIn = !!session;

  return (
    <div className="min-h-screen bg-navy text-navy-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo onDark />
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild>
              <Link to="/">Open workspace</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="text-navy-foreground hover:bg-white/10 hover:text-navy-foreground"
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <section className="mx-auto max-w-3xl py-12 text-center sm:py-16">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
            The advice lifecycle
          </p>
          <h1 className="mt-3 text-4xl font-medium leading-tight sm:text-5xl sm:leading-[1.15]">
            From first scan to annual review, in a fixed legal order.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-navy-foreground/70">
            Every step is checked by the compliance engine. Out-of-order actions are refused and
            logged.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {signedIn ? (
              <Button asChild size="lg">
                <Link to="/">Open workspace</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link to="/signup">Create account</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-transparent text-navy-foreground hover:bg-white/10 hover:text-navy-foreground"
                >
                  <Link to="/login">Sign in</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <LifecycleDiagram heading={false} />
      </main>
    </div>
  );
}
