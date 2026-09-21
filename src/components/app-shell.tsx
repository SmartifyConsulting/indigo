import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Plug,
  RotateCcw,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { actions, resetDemo, useAppState } from "@/lib/domain/store";
import { PROVIDERS, ROLE_LABEL, type Role } from "@/lib/domain/types";
import { initials } from "@/lib/fmt";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Record<Role, NavItem[]> = {
  advisor: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/clients", label: "Clients", icon: Users },
    { to: "/reports", label: "Documents & ROAs", icon: FileText },
    { to: "/integrations", label: "Integrations", icon: Plug },
  ],
  client: [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/portfolios", label: "My wealth & protection", icon: Wallet },
    { to: "/actions", label: "Actions & signatures", icon: ClipboardCheck },
    { to: "/reports", label: "My documents", icon: FileText },
  ],
  fsp: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/compliance", label: "Compliance & audit", icon: ShieldCheck },
    { to: "/clients", label: "Client pipeline", icon: Users },
    { to: "/integrations", label: "Integrations", icon: Plug },
    { to: "/billing", label: "Billing", icon: CreditCard },
  ],
  insurer: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/applications", label: "Applications", icon: Inbox },
  ],
};

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: (() => void) | undefined }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV[role].map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          activeOptions={{ exact: to === "/" }}
          className="flex h-10 items-center gap-3 border-l-2 border-transparent px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{
            className: "border-primary bg-sidebar-accent text-sidebar-accent-foreground",
          }}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function ContextPicker() {
  const s = useAppState();
  if (s.session.role === "client") {
    return (
      <Select value={s.session.clientCaseId} onValueChange={(v) => actions.setClientCase(v)}>
        <SelectTrigger
          className="h-8 w-44 border-navy-muted bg-navy text-xs text-navy-foreground"
          aria-label="Viewing as client"
        >
          <SelectValue placeholder="Choose client" />
        </SelectTrigger>
        <SelectContent>
          {s.cases.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.clientName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (s.session.role === "insurer") {
    return (
      <Select
        value={s.session.insurerId}
        onValueChange={(v) => actions.setInsurer(v as (typeof PROVIDERS)[number]["id"])}
      >
        <SelectTrigger
          className="h-8 w-44 border-navy-muted bg-navy text-xs text-navy-foreground"
          aria-label="Insurer"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROVIDERS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return null;
}

function RoleSwitcher() {
  const s = useAppState();
  const navigate = useNavigate();
  return (
    <Select
      value={s.session.role}
      onValueChange={(v) => {
        actions.setRole(v as Role);
        void navigate({ to: "/" });
      }}
    >
      <SelectTrigger
        className="h-8 w-52 border-navy-muted bg-navy text-xs text-navy-foreground"
        aria-label="Switch role"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <SelectItem key={r} value={r}>
            View as {ROLE_LABEL[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function useIdentity() {
  const s = useAppState();
  switch (s.session.role) {
    case "advisor":
      return { name: s.advisors[0]!.name, sub: s.advisors[0]!.title };
    case "client": {
      const c = s.cases.find((x) => x.id === s.session.clientCaseId);
      return { name: c?.clientName ?? "Client", sub: "Client" };
    }
    case "fsp":
      return { name: s.fsp.keyIndividual, sub: `Key Individual, ${s.fsp.fspNumber}` };
    case "insurer": {
      const p = PROVIDERS.find((x) => x.id === s.session.insurerId);
      return { name: p?.name ?? "Insurer", sub: "Underwriting desk" };
    }
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const s = useAppState();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const id = useIdentity();
  const role = s.session.role;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-navy px-4 text-navy-foreground">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-navy-foreground hover:bg-navy-muted hover:text-navy-foreground lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="bg-navy px-4 py-4">
              <Logo onDark />
            </div>
            <div className="py-3">
              <NavLinks role={role} onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" aria-label="Home">
          <Logo onDark />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <ContextPicker />
            <RoleSwitcher />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-navy-muted"
                aria-label="Account menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-brand text-xs font-semibold text-brand-foreground">
                    {initials(id.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-sm font-medium leading-4">{id.name}</span>
                  <span className="block truncate text-xs leading-4 text-navy-foreground/70">
                    {id.sub}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="truncate text-xs text-muted-foreground">{s.fsp.name}</span>
              </DropdownMenuLabel>
              <div className="px-2 pb-2 md:hidden">
                <div className="flex flex-col gap-2 [&_button]:w-full">
                  <RoleSwitcher />
                  <ContextPicker />
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => resetDemo()}>
                <RotateCcw className="h-4 w-4" /> Reset demo data
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void navigate({ to: "/login" })}>
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r bg-sidebar lg:block">
          <div className="sticky top-14 py-4">
            <NavLinks role={role} />
          </div>
        </aside>
        <main
          key={role + pathname.split("/")[1]}
          className={cn("min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8")}
        >
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
