import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LanguageSelector } from "@/components/language-selector";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type AuthTab = "signin" | "signup";

const TABS = [
  { id: "signin", to: "/login", key: "auth.signin" },
  { id: "signup", to: "/signup", key: "auth.signup" },
] as const;

/**
 * Sign in / Create account switch. With `onChange` it swaps in place (home page);
 * without it the tabs are links between the /login and /signup pages.
 */
export function AuthTabs({
  active,
  onChange,
}: {
  active: AuthTab;
  onChange?: ((tab: AuthTab) => void) | undefined;
}) {
  const { t } = useI18n();
  const cls = (on: boolean) =>
    cn(
      "rounded-md py-2 text-center text-sm font-medium transition-colors",
      on
        ? "border border-border bg-card text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );
  return (
    <nav className="mb-6 grid grid-cols-2 gap-1 rounded-md bg-secondary p-1" aria-label="Account">
      {TABS.map((tab) =>
        onChange ? (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={active === tab.id}
            className={cls(active === tab.id)}
          >
            {t(tab.key)}
          </button>
        ) : (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={active === tab.id ? "page" : undefined}
            className={cls(active === tab.id)}
          >
            {t(tab.key)}
          </Link>
        ),
      )}
    </nav>
  );
}

/** Full-bleed navy canvas with a centred card, as on the reference broker portal login. */
export function AuthLayout({
  title,
  subtitle,
  children,
  wide = false,
  tab,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  wide?: boolean;
  /** Show the sign-in / create-account switch with this tab active. */
  tab?: AuthTab | undefined;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center bg-navy px-4 pb-10 pt-16 sm:pt-20">
      <LanguageSelector className="absolute right-4 top-4" />
      <Link to="/welcome" aria-label="Back to the indigro home page" className="mb-8">
        <Logo size="lg" onDark />
      </Link>
      <div
        className={`w-full rounded-lg border bg-card px-6 py-10 sm:py-12 ${wide ? "max-w-[560px] sm:px-12" : "max-w-[494px] sm:px-24"}`}
      >
        {tab && <AuthTabs active={tab} />}
        <h1 className="title-lg mb-3 text-center">{title}</h1>
        {subtitle && <p className="mb-6 text-center text-sm">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
