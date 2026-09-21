import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LanguageSelector } from "@/components/language-selector";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type AuthTab = "signin" | "signup";

/** Soft, rounded frame (24px) with 14px controls inside, matching tag-tech.co.za. */
export const SOFT_FRAME =
  "rounded-[24px] [&_input]:rounded-[14px] [&_button:not([aria-pressed])]:rounded-[14px]";

const TABS = [
  { id: "signin", key: "auth.signin" },
  { id: "signup", key: "auth.signup" },
] as const;

/** Sign in / Create account switch. Swaps the form in place, without leaving the page. */
export function AuthTabs({
  active,
  onChange,
}: {
  active: AuthTab;
  onChange: (tab: AuthTab) => void;
}) {
  const { t } = useI18n();
  return (
    <nav
      className="mb-6 grid grid-cols-2 gap-1 rounded-[14px] bg-secondary p-1"
      aria-label="Account"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={active === tab.id}
          className={cn(
            "rounded-[10px] py-2 text-center text-sm font-medium transition-colors",
            active === tab.id
              ? "border border-border bg-card text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(tab.key)}
        </button>
      ))}
    </nav>
  );
}

/** Full-bleed navy canvas with a centred card, as on the reference broker portal login. */
export function AuthLayout({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center bg-navy px-4 pb-10 pt-16 sm:pt-20">
      <LanguageSelector className="absolute right-4 top-4" />
      <Link to="/welcome" aria-label="Back to the indigro home page" className="mb-8">
        <Logo size="lg" onDark />
      </Link>
      <div
        className={`w-full border bg-card px-6 py-10 sm:py-12 ${SOFT_FRAME} ${wide ? "max-w-[560px] sm:px-12" : "max-w-[494px] sm:px-24"}`}
      >
        <h1 className="title-lg mb-3 text-center">{title}</h1>
        {subtitle && <p className="mb-6 text-center text-sm">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
