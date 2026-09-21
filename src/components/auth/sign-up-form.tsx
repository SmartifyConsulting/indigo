import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { mapAuthError } from "@/lib/use-auth";

/**
 * The create-account form, shared by the /signup page and the home page.
 * `onSwitchToSignIn` swaps to the sign-in tab in place; without it the links go to /login.
 */
export function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn?: (() => void) | undefined }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", password: "", fsp: "", fspNumber: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const strongPassword =
    form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password);
  const valid =
    form.name.trim().length > 2 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.fsp.trim().length > 2 &&
    strongPassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError("Check your details: a password needs 8+ characters with a letter and a number.");
      return;
    }
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: form.name, fsp_name: form.fsp, fsp_number: form.fspNumber },
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

  const backToSignIn = (label: string) =>
    onSwitchToSignIn ? (
      <button type="button" onClick={onSwitchToSignIn} className="text-primary hover:underline">
        {label}
      </button>
    ) : (
      <Link to="/login" className="text-primary hover:underline">
        {label}
      </Link>
    );

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center text-sm">
        <MailCheck className="h-8 w-8 text-primary" />
        <p className="font-medium">Confirm your email</p>
        <p>
          We sent a confirmation link to <strong>{form.email}</strong>. Click it to finish setting
          up {form.fsp}.
        </p>
        {backToSignIn("Back to sign in")}
      </div>
    );
  }

  return (
    <>
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Your full name">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
          />
        </Field>
        <Field label={t("auth.email")}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field
          label={t("auth.password")}
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
        <Field label="Financial services provider (FSP) name">
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

      <p className="mt-5 text-center text-sm">Already have an agency? {backToSignIn("Log in")}</p>
    </>
  );
}
