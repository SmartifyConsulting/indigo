import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth-layout";
import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";
import { mapAuthError, passwordChecks, SIGNUP_ROLES, type SignupRole } from "@/lib/use-auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: `Create your account | ${BRAND.name}` },
      { name: "description", content: `Join the ${BRAND.name} advice workspace.` },
      { property: "og:title", content: `Create your account | ${BRAND.name}` },
      { property: "og:description", content: `Join the ${BRAND.name} advice workspace.` },
    ],
  }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    fsp: "",
    fspNumber: "",
    role: "advisor" as SignupRole,
  });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);

  const checks = passwordChecks(form.password, form.email);
  const strong = checks.every((c) => c.ok);
  const roleMeta = SIGNUP_ROLES.find((r) => r.value === form.role)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!strong) {
      const msg = "Your password does not meet the rules below yet.";
      setError(msg);
      toast.error(msg);
      passwordRef.current?.focus();
      return;
    }
    if (form.name.trim().length < 3 || !/\S+@\S+\.\S+/.test(form.email)) {
      setError("Enter your full name and a valid work email address.");
      return;
    }
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: form.name,
          fsp_name: form.fsp,
          fsp_number: form.fspNumber,
          requested_role: form.role,
        },
      },
    });
    setBusy(false);
    if (err) {
      const msg = mapAuthError(err.message);
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!roleMeta.instant) {
      toast.success(
        `Account created. Your request to join as ${roleMeta.label.toLowerCase()} is waiting for an administrator to approve it.`,
      );
    }
    if (data.session) void navigate({ to: "/dashboard" });
    else void navigate({ to: "/login" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Google sign-in could not be started.");
  }

  return (
    <AuthLayout
      wide
      title={`Create your ${BRAND.name} account`}
      subtitle="Tell us who you are joining as, and you are straight in."
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Your full name">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
          />
        </Field>
        <Field label="Work email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </Field>

        <Field
          label="I am signing up as"
          hint={
            roleMeta.instant
              ? "You get this access immediately."
              : "This access is requested: an administrator approves it before it takes effect."
          }
        >
          <Select
            value={form.role}
            onValueChange={(v) => setForm({ ...form, role: v as SignupRole })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIGNUP_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Password">
          <div className="relative">
            <Input
              ref={passwordRef}
              type={show ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <ul className="space-y-1 text-xs" aria-live="polite">
          {checks.map((c) => (
            <li
              key={c.id}
              className={c.ok ? "flex items-center gap-2 text-positive" : "flex items-center gap-2 text-muted-foreground"}
            >
              {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {c.label}
            </li>
          ))}
        </ul>

        <Field label="Financial services provider (FSP) name" hint="Optional for clients.">
          <Input value={form.fsp} onChange={(e) => setForm({ ...form, fsp: e.target.value })} />
        </Field>
        <Field
          label="FSP licence number"
          hint="Optional now; verified against the FSCA register later."
        >
          <Input
            value={form.fspNumber}
            onChange={(e) => setForm({ ...form, fspNumber: e.target.value })}
            placeholder="FSP 12345"
          />
        </Field>

        {error && (
          <p aria-live="polite" className="text-sm text-negative">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="outline" className="w-full" onClick={() => void google()}>
        Continue with Google
      </Button>

      <p className="mt-5 text-center text-sm">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
