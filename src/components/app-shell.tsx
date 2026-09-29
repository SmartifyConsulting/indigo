import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  FolderKanban,
  Building2,
  Check,
  ClipboardCheck,
  CreditCard,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Workflow,
  LogOut,
  Moon,
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
import { isAdmin as isAdminFn } from "@/lib/admin.functions";
import { Switch } from "@/components/ui/switch";
import { getStage } from "@/lib/domain/gates";
import { actions, resetDemo, useAppState } from "@/lib/domain/store";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/use-auth";
import { PROVIDERS, ROLE_LABEL, ROLE_TAG, type Role } from "@/lib/domain/types";
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
    { to: "/workspace", label: "Live Workspace", icon: Workflow },
    { to: "/clients", label: "Clients", icon: Users },
    { to: "/cases", label: "All Cases", icon: FolderKanban },
    { to: "/reports", label: "Documents & ROAs", icon: FileText },
  ],
  client: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/workspace", label: "Live Workspace", icon: Workflow },
    { to: "/portfolios", label: "My Wealth & Protection", icon: Wallet },
    { to: "/actions", label: "Actions & Signatures", icon: ClipboardCheck },
    { to: "/reports", label: "My Documents", icon: FileText },
  ],
  fsp: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/workspace", label: "Live Workspace", icon: Workflow },
    { to: "/compliance", label: "Compliance & Audit", icon: ShieldCheck },
    { to: "/clients", label: "Client Pipeline", icon: Users },
    { to: "/cases", label: "All Cases", icon: FolderKanban },
    { to: "/billing", label: "Billing", icon: CreditCard },
  ],
  insurer: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/workspace", label: "Live Workspace", icon: Workflow },
    { to: "/applications", label: "Applications", icon: Inbox },
  ],
};

const ADMIN_NAV: NavItem[] = [{ to: "/admin/integrations", label: "APIs", icon: KeyRound }];

function useIsAdmin() {
  const check = useServerFn(isAdminFn);
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data } = useQuery({
    queryKey: ["is-admin", userId],
    queryFn: () => check(),
    enabled: !!userId,
    retry: false,
  });
  return !!userId && data?.admin === true;
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
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const onAdminView = pathname.startsWith("/admin");
  return (
    <nav aria-label="Main" className="border-t border-white/10 px-2 sm:px-4">
      <ul className="flex items-center gap-1 overflow-x-auto">
        {(NAV[role] ?? NAV.advisor).map((item) => (
          <li key={item.to} className="shrink-0">
            <NavLink {...item} />
          </li>
        ))}
        {onAdminView && (
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

interface SwitchUserOption {
  role: Role;
  name: string;
}

/** The case shown for the "Client" quick-switch: Georgia Adams if she exists, else whichever
 * case is furthest along the advice lifecycle (the one that best shows off the client dashboard). */
function useDemoClientCase() {
  const s = useAppState();
  const named = s.cases.find((c) => c.clientName === "Georgia Adams");
  if (named) return named;
  return [...s.cases].sort((a, b) => getStage(b) - getStage(a))[0];
}

function useSwitchUserOptions(): SwitchUserOption[] {
  const s = useAppState();
  const demoClient = useDemoClientCase();
  return [
    { role: "client", name: demoClient?.clientName ?? "Client" },
    { role: "advisor", name: s.advisors?.[0]?.name ?? "Wealth Manager" },
    { role: "fsp", name: s.fsp?.keyIndividual ?? "Key Individual" },
    { role: "insurer", name: PROVIDERS[0]?.name ?? "Insurer" },
  ];
}

function SwitchUserMenu() {
  const s = useAppState();
  const navigate = useNavigate();
  const options = useSwitchUserOptions();
  const demoClient = useDemoClientCase();

  return (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">Switch User</DropdownMenuLabel>
      {options.map((opt) => (
        <DropdownMenuItem
          key={opt.role}
          onSelect={() => {
            if (opt.role === "client" && demoClient) actions.setClientCase(demoClient.id);
            if (opt.role === "insurer" && PROVIDERS[0]) actions.setInsurer(PROVIDERS[0].id);
            actions.setRole(opt.role);
            void navigate({ to: "/" });
          }}
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-secondary text-[10px] font-semibold">
              {ROLE_TAG[opt.role]}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate">{opt.name}</span>
          <span className="text-xs text-muted-foreground">{ROLE_LABEL[opt.role]}</span>
          {s.session.role === opt.role && <Check className="h-4 w-4 text-brand" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}

function useIdentity() {
  const s = useAppState();
  switch (s.session.role) {
    case "advisor":
      return {
        name: s.advisors?.[0]?.name ?? "Adviser",
        sub: s.advisors?.[0]?.title ?? "Adviser",
      };
    case "client": {
      const c = s.cases?.find((x) => x.id === s.session.clientCaseId);
      return { name: c?.clientName ?? "Client", sub: "Client" };
    }
    case "fsp":
      return {
        name: s.fsp?.keyIndividual ?? "Key Individual",
        sub: `Key Individual${s.fsp?.fspNumber ? `, ${s.fsp.fspNumber}` : ""}`,
      };
    case "insurer": {
      const p = PROVIDERS.find((x) => x.id === s.session.insurerId);
      return { name: p?.name ?? "Insurer", sub: "Underwriting desk" };
    }
  }
  return { name: "User", sub: "" };
}

function InboxButton() {
  return (
    <Link
      to="/inbox"
      aria-label="Inbox"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-foreground/30 text-navy-foreground/80 transition-colors hover:text-brand"
      activeProps={{ className: "text-brand border-brand" }}
    >
      <Bell className="h-4 w-4" />
    </Link>
  );
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
  const isAdmin = useIsAdmin();

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <div className="sticky top-0 z-30 bg-navy text-navy-foreground">
        <header className="flex h-14 items-center gap-3 px-4">
          <Link to="/" aria-label="Home">
            <Logo onDark />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <InboxButton />
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
                  <span className="truncate text-xs text-muted-foreground">{s.fsp?.name ?? ""}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <SwitchUserMenu />
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/integrations">
                      <KeyRound className="h-4 w-4" /> APIs
                    </Link>
                  </DropdownMenuItem>
                )}
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
