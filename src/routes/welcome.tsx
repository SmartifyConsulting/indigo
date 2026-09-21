import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AuthTabs, type AuthTab } from "@/components/auth-layout";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Logo } from "@/components/brand/logo";
import { LanguageSelector } from "@/components/language-selector";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
  const [tab, setTab] = useState<AuthTab>("signin");
  const signedIn = !!session;

  return (
    <div className="min-h-screen bg-navy text-navy-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo onDark />
        <LanguageSelector />
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:pt-14">
        <section>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
            The advice lifecycle
          </p>
          <h1 className="mt-3 text-4xl font-medium leading-tight sm:text-5xl sm:leading-[1.15]">
            From first scan to annual review, in a fixed legal order.
          </h1>
          <p className="mt-4 max-w-xl text-base text-navy-foreground/70">
            Every step is checked by the compliance engine. Out-of-order actions are refused and
            logged.
          </p>
        </section>

        <section className="w-full max-w-[520px] rounded-lg border bg-card p-6 text-card-foreground sm:p-8 lg:justify-self-end">
          {signedIn ? (
            <div className="space-y-4 text-center">
              <h2 className="title-lg">Welcome back</h2>
              <p className="text-sm text-muted-foreground">You are signed in.</p>
              <Button asChild className="w-full">
                <Link to="/">Open workspace</Link>
              </Button>
            </div>
          ) : (
            <>
              <AuthTabs active={tab} onChange={setTab} />
              <h2 className="title-lg mb-5 text-center">
                {tab === "signin" ? t("auth.signin") : `Set up your agency on ${BRAND.name}`}
              </h2>
              {tab === "signin" ? (
                <SignInForm />
              ) : (
                <SignUpForm onSwitchToSignIn={() => setTab("signin")} />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
