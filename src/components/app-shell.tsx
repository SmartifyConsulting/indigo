import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  FolderKanban,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Workflow,
  LogOut,
  Moon,
  Plug,
  RotateCcw,
  Sun,
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
import { isAdmin as isAdminFn } from "@/lib/admin.functions";
import { Switch } from "@/components/ui/switch";
import { actions, resetDemo, useAppState } from "@/lib/domain/store";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/use-auth";
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
    { to: "/workspace", label: "Live Workspace", icon: Workflow },
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/clients", label: "Clients", icon: Users },
    { to: "/cases", label: "All cases", icon: FolderKanban },
    { to: "/inbox", label: "Inbox", icon: Bell },
    { to: "/reports", label: "Documents & ROAs", icon: FileText },
    { to: "/integrations", label: "Integrations", icon: Plug },
  ],
  client: [
    { to: "/workspace", label: "Live Workspace", icon: Workflow },
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/portfolios", label: "My wealth & protection", icon: Wallet },
    { to: "/actions", label: "Actions & signatures", icon: ClipboardCheck },
    { to: "/reports", label: "My documents", icon: FileText },
    { to: "/inbox", label: "Inbox", icon: Bell },
  ],
  fsp: [
    { to: "/workspace", label: "Live Workspace", icon: Workflow },
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/compliance", label: "Compliance & audit", icon: ShieldCheck },
    { to: "/clients", label: "Client pipeline", icon: Users },
    { to: "/cases", label: "All cases", icon: FolderKanban },
    { to: "/inbox", label: "Inbox", icon: Bell },
    { to: "/integrations", label: "Integrations", icon: Plug },
    { to: "/billing", label: "Billing", icon: CreditCard },
  ],
  insurer: [
    { to: "/workspace", label: "Live Workspace", icon: Workflow },
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/applications", label: "Applications", icon: Inbox },
    { to: "/inbox", label: "Inbox", icon: Bell },
  ],
  admin: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
};

const ADMIN_NAV: NavItem[] = [{ to: "/admin/integrations", label: "APIs", icon: KeyRound }];

function useIsAdmin() {
  const check = useServerFn(isAdminFn);
  const { data } = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });
  return data?.admin === true;
}

function NavLink({ to, label, icon: Icon }: NavItem) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="flex h-11 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-navy-foreground/70 transition-colors hover:text-navy-foreground"
      activeProps={{ className: "border-brand text-navy-foreground" }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

/** Main menu, a horizontal row under the header. Scrolls sideways on narrow screens. */
function NavLinks({ role }: { role: Role }) {
  const admin = useIsAdmin();
  return (
    <nav aria-label="Main" className="border-t border-white/10 px-2 sm:px-4">
      <ul className="flex items-center gap-1 overflow-x-auto">
        {NAV[role].map((item) => (
          <li key={item.to} className="shrink-0">
            <NavLink {...item} />
          </li>
        ))}
        {admin && (
          <>
            <li aria-hidden className="mx-2 h-5 w-px shrink-0 bg-white/20" />
            {ADMIN_NAV.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink {...item} />
              </li>
            ))}
          </>
        )}
      </ul>
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
    case "admin":
      return { name: "Georgia Adams", sub: "Admin" };
  }
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-foreground/30 text-navy-foreground/80 transition-colors hover:text-brand"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function ThemeItem() {
  const { dark, toggle } = useTheme();
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        toggle();
      }}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      Dark mode
      <Switch checked={dark} className="pointer-events-none ml-auto" tabIndex={-1} aria-hidden />
    </DropdownMenuItem>
  );
}

type ShellBackground = "navy" | "white" | "default";

/** Page background behind each screen's content. Everything else keeps the default light grey. */
const SCREEN_BACKGROUND: Record<string, ShellBackground> = {
  "/": "white",
  "/workspace": "white",
};

/** `background` overrides the per-screen default, e.g. for previews. */
export function AppShell({
  children,
  background,
}: {
  children: ReactNode;
  background?: ShellBackground | undefined;
}) {
  const s = useAppState();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const tone = background ?? SCREEN_BACKGROUND[pathname] ?? "default";
  const id = useIdentity();
  const { signOut } = useAuth();
  const role = s.session.role;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <div className="sticky top-0 z-30 bg-navy text-navy-foreground">
        <header className="flex h-14 items-center gap-3 px-4">
          <Link to="/" aria-label="Home">
            <Logo onDark />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <ContextPicker />
              <RoleSwitcher />
            </div>
            <ThemeToggle />
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
                <ThemeItem />
                <DropdownMenuItem onSelect={() => resetDemo()}>
                  <RotateCcw className="h-4 w-4" /> Reset demo data
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    void signOut().then(() => navigate({ to: "/welcome" }));
                  }}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <NavLinks role={role} />
      </div>

      <main
        key={role + pathname.split("/")[1]}
        className={cn(
          "min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8",
          tone === "navy" && "bg-navy",
          tone === "white" && "bg-card",
        )}
      >
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
