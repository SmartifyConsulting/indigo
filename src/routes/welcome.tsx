import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";

import { AuthTabs, SOFT_FRAME, type AuthTab } from "@/components/auth-layout";
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
      { title: `${BRAND.name}: ${HERO.title}` },
      { name: "description", content: HERO.subtitle },
      { property: "og:title", content: `${BRAND.name}: ${HERO.title}` },
      { property: "og:description", content: HERO.subtitle },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { tab?: "signup" | undefined } =>
    search["tab"] === "signup" ? { tab: "signup" } : {},
  component: Welcome,
});

const HERO = {
  eyebrow: "Life cover · Investments · Governance",
  title: "Smart Governance for Portfolio Growth",
  subtitle:
    "For FSPs and their advisors: advise on life cover and investments, grow your clients' income, and show your Key Individual and the regulator that every step followed the rules.",
  columns: [
    {
      heading: "For your clients",
      points: [
        "Life cover sized to what their family would really need",
        "Investments to grow their income, chosen around their goals",
        "One clear plan, signed digitally and reviewed every year",
      ],
    },
    {
      heading: "For your FSP",
      points: [
        "Compliance checks that stop out-of-order steps before they happen",
        "A tamper-evident record of every disclosure, signature and piece of advice",
        "Live oversight of every advisor for your Key Individual",
      ],
    },
  ],
  footnote:
    "Life policies and investments carry risk and returns are not guaranteed. indigro supports, and does not replace, your FSP's own compliance responsibilities. Advice is provided by licensed financial services providers.",
} as const;

function Welcome() {
  const { session } = useAuth();
  const { t } = useI18n();
  const { tab: startTab } = Route.useSearch();
  const [tab, setTab] = useState<AuthTab>(startTab === "signup" ? "signup" : "signin");
  const signedIn = !!session;

  return (
    <div className="min-h-screen bg-navy text-navy-foreground [--primary-foreground:var(--brand-foreground)] [--primary-soft:var(--brand-soft)] [--primary:var(--brand)] [--ring:var(--brand)]">
      <header className="mx-auto flex max-w-6xl items-center justify-end px-4 py-5 sm:px-8">
        <LanguageSelector />
      </header>

      <main className="mx-auto grid max-w-6xl items-start gap-10 px-4 pb-16 pt-2 sm:px-8 lg:min-h-[calc(100vh-88px)] lg:grid-cols-[1.1fr_0.9fr] lg:content-center lg:gap-14 lg:pb-24 lg:pt-0">
        <section>
          <Logo size="hero" onDark className="mb-8 leading-none" />
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
            {HERO.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-medium leading-tight sm:text-5xl sm:leading-[1.15]">
            {HERO.title}
          </h1>
          <p className="mt-4 max-w-xl text-base text-navy-foreground/70">{HERO.subtitle}</p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {HERO.columns.map((col) => (
              <div key={col.heading}>
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
                  {col.heading}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {col.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-navy-foreground/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-xl text-xs leading-5 text-navy-foreground/55">{HERO.footnote}</p>
        </section>

        <section
          className={`w-full max-w-[520px] border bg-card p-6 text-card-foreground sm:p-8 lg:justify-self-end ${SOFT_FRAME}`}
        >
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
                {tab === "signin" ? t("auth.signin") : `Create your ${BRAND.name} account`}
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
