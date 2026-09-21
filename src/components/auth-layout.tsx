import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "signin", to: "/login", label: "Sign in" },
  { id: "signup", to: "/signup", label: "Create account" },
] as const;

/** Switch between signing in and creating an account without leaving the card. */
function AuthTabs({ active }: { active: "signin" | "signup" }) {
  return (
    <nav className="mb-6 grid grid-cols-2 gap-1 rounded-md bg-secondary p-1" aria-label="Account">
      {TABS.map((t) => (
        <Link
          key={t.id}
          to={t.to}
          aria-current={active === t.id ? "page" : undefined}
          className={cn(
            "rounded-md py-2 text-center text-sm font-medium transition-colors",
            active === t.id
              ? "border border-border bg-card text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Full-bleed navy canvas with a centred white card, as on the reference broker portal login. */
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
  tab?: "signin" | "signup" | undefined;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-navy px-4 pb-10 pt-16 sm:pt-20">
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
