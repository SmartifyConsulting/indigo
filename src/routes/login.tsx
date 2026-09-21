import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, ShieldCheck, User, Users } from "lucide-react";
import { useState } from "react";

import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND } from "@/lib/brand";
import { actions } from "@/lib/domain/store";
import { ROLE_LABEL, type Role } from "@/lib/domain/types";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: `Sign in | ${BRAND.name}` }] }),
  component: Login,
});

const ROLES: { role: Role; icon: typeof User; hint: string }[] = [
  { role: "advisor", icon: Users, hint: "Run needs analyses, quotes and ROAs" },
  { role: "client", icon: User, hint: "View your cover, sign and upload" },
  { role: "fsp", icon: ShieldCheck, hint: "Supervise advisors and audit records" },
  { role: "insurer", icon: Building2, hint: "Review and issue applications" },
];

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"domain" | "role">("domain");
  const [domain, setDomain] = useState<string>(BRAND.demoAgency);

  if (step === "role") {
    return (
      <AuthLayout title="Continue as" subtitle={`${domain}${BRAND.domainSuffix}`}>
        <div className="space-y-2">
          {ROLES.map(({ role, icon: Icon, hint }) => (
            <button
              key={role}
              onClick={() => {
                actions.setRole(role);
                void navigate({ to: "/" });
              }}
              className="flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors hover:border-primary hover:bg-accent"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span>
                <span className="block text-sm font-medium">{ROLE_LABEL[role]}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Prototype: pick a role to explore. Real sign-in replaces this step.
        </p>
        <button
          onClick={() => setStep("domain")}
          className="mx-auto mt-3 block text-sm text-primary hover:underline"
        >
          Use a different domain
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Log in to your portal" subtitle="Enter your agency's custom domain.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (domain.trim()) setStep("role");
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value.trim().toLowerCase())}
            placeholder="agency-domain"
            className="min-w-0 flex-1 text-right"
            aria-label="Agency domain"
          />
          <span className="text-sm">{BRAND.domainSuffix}</span>
        </div>
        <Button type="submit" className="mb-4 w-full" disabled={!domain.trim()}>
          Continue
        </Button>
      </form>
      <div className="flex flex-col items-center gap-2 text-sm">
        <a href="#" className="text-primary hover:underline" onClick={(e) => e.preventDefault()}>
          Find your agency's domain
        </a>
        <Link to="/signup" className="text-primary hover:underline">
          Set up a new agency
        </Link>
      </div>
    </AuthLayout>
  );
}
