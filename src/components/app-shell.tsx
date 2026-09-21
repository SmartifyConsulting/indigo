import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Search,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/portfolios", label: "Portfolios", icon: PieChart },
  { to: "/reports", label: "Reports", icon: FileText },
] as const;

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("inline-block", className)}>
      <span className="wordmark text-2xl leading-none text-brand">indio</span>
      <div className="mt-1 h-px w-full bg-navy-foreground/70" />
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <nav className="flex flex-col gap-1">
      {nav.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          activeOptions={{ exact: to === "/" }}
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{
            className: "bg-brand text-brand-foreground hover:bg-brand hover:text-brand-foreground",
          }}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex h-full flex-col bg-sidebar px-4 py-6">
      <div className="px-2">
        <Wordmark />
        <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
          Wealth Management
        </p>
      </div>

      <div className="mt-8 flex-1">
        <p className="px-3 pb-2 text-[11px] uppercase tracking-[0.16em] text-sidebar-foreground/50">
          Workspace
        </p>
        <NavLinks onNavigate={onNavigate} />
      </div>

      <div className="mt-6 border-t border-sidebar-border pt-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-brand text-xs font-semibold text-brand-foreground">
              EK
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">Erin Kruger</p>
            <p className="truncate text-xs text-sidebar-foreground/60">Senior Adviser</p>
          </div>
          <LogOut className="h-4 w-4 text-sidebar-foreground/60" />
        </div>
      </div>
    </div>
  );
}

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/clients": "Clients",
  "/portfolios": "Portfolios",
  "/reports": "Reports & documents",
};

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title =
    titles[pathname] ?? (pathname.startsWith("/clients/") ? "Client detail" : "Indio");

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64">
          <SidebarBody />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur md:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-0 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <h1 className="wordmark text-lg text-foreground md:text-xl">{title}</h1>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients, portfolios…"
                className="w-64 pl-9"
                aria-label="Global search"
              />
            </div>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                EK
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
