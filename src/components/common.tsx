import { Link } from "@tanstack/react-router";
import { Check, Lock, X } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STAGES, getStage, isComplete, type Gate, type StageNo } from "@/lib/domain/gates";
import { useAppState } from "@/lib/domain/store";
import type { CaseRecord, Role } from "@/lib/domain/types";
import { ROLE_LABEL } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** True where a page sits directly on the navy background (the home dashboard). */
export const OnDarkContext = createContext(false);

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  const onDark = useContext(OnDarkContext);
  return (
    <div className="mb-6">
      {back && (
        <Link
          to={back.to}
          className={cn(
            "mb-2 inline-block text-sm hover:underline",
            onDark ? "text-brand" : "text-primary",
          )}
        >
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className={cn("title-lg", onDark ? "text-navy-foreground" : "text-foreground")}>
            {title}
          </h1>
          {description && (
            <p
              className={cn(
                "mt-1 text-sm",
                onDark ? "text-navy-foreground/70" : "text-muted-foreground",
              )}
            >
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "danger" | "success" | "warning" | undefined;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={cn(
            "title-lg mt-2 text-2xl",
            tone === "danger" && "text-negative",
            tone === "success" && "text-positive",
            tone === "warning" && "text-warning",
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-card px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session } = useAppState();
  if (session.role === "admin" || roles.includes(session.role)) return <>{children}</>;
  return (
    <EmptyState title="This page isn't part of your role">
      You are viewing as {ROLE_LABEL[session.role]}. Use the role switcher in the header to change
      view, or{" "}
      <Link to="/" className="text-primary hover:underline">
        return to your dashboard
      </Link>
      .
    </EmptyState>
  );
}

/** Blocked-action feedback that names exactly what is missing. */
export function toastResult(r: { ok: boolean; blockers?: string[] }, success?: string) {
  if (r.ok) {
    if (success) toast.success(success);
    return true;
  }
  toast.error("Blocked by compliance rules", { description: r.blockers?.join(" · ") });
  return false;
}

export function StageBadge({ c }: { c: CaseRecord }) {
  const stage = getStage(c);
  if (isComplete(c)) return <Badge variant="success">Complete</Badge>;
  if (c.identity.sanctions === "hit") return <Badge variant="danger">Escalated to KI</Badge>;
  return (
    <Badge variant="info">
      Stage {stage} · {STAGES[stage - 1]!.short}
    </Badge>
  );
}

export function StageDots({ stage, complete }: { stage: StageNo; complete?: boolean }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Stage ${stage} of 6`}>
      {STAGES.map((st) => (
        <span
          key={st.no}
          className={cn(
            "h-1.5 w-5 rounded-sm",
            complete || st.no < stage
              ? "bg-positive"
              : st.no === stage
                ? "bg-primary"
                : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

export function GateList({ gates, title }: { gates: Gate[]; title?: string }) {
  return (
    <div>
      {title && (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      )}
      <ul className="space-y-2">
        {gates.map((g) => (
          <li key={g.id} className="flex items-start gap-2 text-sm">
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm",
                g.met ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
              )}
            >
              {g.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </span>
            <span>
              <span className={g.met ? "text-foreground" : "font-medium text-foreground"}>
                {g.label}
              </span>
              {!g.met && g.detail && (
                <span className="block text-xs text-muted-foreground">{g.detail}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LockedBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div>{children}</div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
