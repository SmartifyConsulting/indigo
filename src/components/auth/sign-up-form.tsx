import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { mapAuthError } from "@/lib/use-auth";

/**
 * What someone says they are signing up as. This is only a *request*, saved with the account
 * for an administrator to approve. It never grants a permission on its own.
 */
export const SIGNUP_ROLES = [
  {
    id: "fsp",
    label: "FSP owner / Key Individual",
    hint: "Runs the firm and oversees compliance",
  },
  {
    id: "advisor",
    label: "Wealth manager / Financial advisor",
    hint: "Advises clients and submits applications",
  },
  { id: "client", label: "Client", hint: "Views my cover, signs and uploads documents" },
  { id: "insurer", label: "Insurer (risk bearer)", hint: "Reviews and issues applications" },
] as const;

export type SignupRole = (typeof SIGNUP_ROLES)[number]["id"];

/**
 * The create-account form. `onSwitchToSignIn` swaps to the sign-in tab in place.
 */
export function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form, setForm] = useState({
    first: "",
    last: "",
    email: "",
    password: "",
    org: "",
    orgNumber: "",
    advisorRef: "",
  });
  const [role, setRole] = useState<SignupRole | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const strongPassword =
    form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password);
  const needsOrg = role === "fsp" || role === "advisor" || role === "insurer";
  const orgLabel = role === "insurer" ? "Insurance company" : "Financial services provider (FSP)";

  /** Every problem with the form, named by field, so the message never blames the wrong one. */
  function problems(): string[] {
    const out: string[] = [];
    if (form.first.trim().length === 0) out.push("Enter your first name.");
    if (form.last.trim().length === 0) out.push("Enter your last name.");
    if (!/\S+@\S+\.\S+/.test(form.email)) out.push("Enter a valid work email address.");
    if (!strongPassword) {
      out.push("Choose a password with 8+ characters, including a letter and a number.");
    } else if (!role) {
      out.push("Choose what you are signing up as.");
    }
    if (needsOrg && form.org.trim().length < 3) {
      out.push(`Enter the name of your ${orgLabel.toLowerCase()} (at least 3 characters).`);
    }
    return out;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = problems();
    if (found.length > 0) {
      setError(found.join(" "));
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
          full_name: `${form.first.trim()} ${form.last.trim()}`,
          first_name: form.first.trim(),
          last_name: form.last.trim(),
          // A request only: nothing here grants access, an administrator approves the role.
          requested_role: role,
          ...(role === "fsp" || role === "advisor"
            ? { fsp_name: form.org.trim(), fsp_number: form.orgNumber.trim() }
            : {}),
          ...(role === "insurer"
            ? { org_name: form.org.trim(), org_number: form.orgNumber.trim() }
            : {}),
          ...(role === "client" ? { advisor_ref: form.advisorRef.trim() } : {}),
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
    if (data.session) void navigate({ to: "/" });
    else setSent(true);
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in could not be started.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/" });
  }

  const backToSignIn = (label: string) => (
    <button type="button" onClick={onSwitchToSignIn} className="text-brand-ink hover:underline">
      {label}
    </button>
  );

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center text-sm">
        <MailCheck className="h-8 w-8 text-brand-ink" />
        <p className="font-medium">Confirm your email</p>
        <p>
          We sent a confirmation link to <strong>{form.email}</strong>. Click it to finish setting
          up your account{needsOrg && form.org ? ` for ${form.org}` : ""}.
        </p>
        <p className="text-xs text-muted-foreground">
          Your access is set up by an administrator based on what you signed up as.
        </p>
        {backToSignIn("Back to sign in")}
      </div>
    );
  }

  return (
    <>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name *">
            <Input
              value={form.first}
              onChange={(e) => setForm({ ...form, first: e.target.value })}
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name *">
            <Input
              value={form.last}
              onChange={(e) => setForm({ ...form, last: e.target.value })}
              autoComplete="family-name"
            />
          </Field>
        </div>
        <Field label={`${t("auth.email")} *`}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field
          label={`${t("auth.password")} *`}
          hint="At least 8 characters, including a letter and a number."
        >
          <div className="relative">
            <Input
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
              aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {strongPassword && (
          <Field
            label="I'm signing up as *"
            hint={`${SIGNUP_ROLES.find((r) => r.id === role)?.hint ?? "Choose the option that fits you"}. An administrator confirms your access after you sign up.`}
          >
            <Select value={role ?? ""} onValueChange={(v) => setRole(v as SignupRole)}>
              <SelectTrigger aria-label="Sign up as">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {SIGNUP_ROLES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {needsOrg && (
          <>
            <Field label={`${orgLabel} name *`}>
              <Input value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} />
            </Field>
            <Field
              label={role === "insurer" ? "Licence or registration number" : "FSP licence number"}
              hint="Optional now; verified against the FSCA register later."
            >
              <Input
                value={form.orgNumber}
                onChange={(e) => setForm({ ...form, orgNumber: e.target.value })}
                placeholder="FSP 12345"
              />
            </Field>
          </>
        )}
        {role === "client" && (
          <Field
            label="Your advisor's name or invitation code"
            hint="Optional. Most clients join through the link or QR code their advisor sends."
          >
            <Input
              value={form.advisorRef}
              onChange={(e) => setForm({ ...form, advisorRef: e.target.value })}
            />
          </Field>
        )}

        {error && (
          <p aria-live="polite" className="text-sm text-negative">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating…" : t("auth.signup")}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> {t("auth.or")}{" "}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="outline" className="w-full" onClick={() => void google()}>
        {t("auth.google")}
      </Button>

      <p className="mt-5 text-center text-sm">Already have an account? {backToSignIn("Log in")}</p>
    </>
  );
}
