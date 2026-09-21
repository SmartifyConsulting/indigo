import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";

/** Full-bleed navy canvas with a centred white card, as on the reference broker portal login. */
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
    <div className="flex min-h-screen flex-col items-center bg-navy px-4 pb-10 pt-16 sm:pt-20">
      <Logo size="lg" onDark className="mb-8" />
      <div
        className={`w-full rounded-lg border bg-card px-6 py-10 sm:py-12 ${wide ? "max-w-[560px] sm:px-12" : "max-w-[494px] sm:px-24"}`}
      >
        <h1 className="title-lg mb-3 text-center">{title}</h1>
        {subtitle && <p className="mb-6 text-center text-sm">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
