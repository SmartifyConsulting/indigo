import type { Session } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const SIGNUP_ROLES = [
  { value: "advisor", label: "Adviser / wealth manager", instant: true },
  { value: "client", label: "Client", instant: true },
  { value: "insurer", label: "Insurer / risk bearer", instant: true },
  { value: "compliance", label: "Compliance officer", instant: false },
  { value: "fsp", label: "FSP administrator / Key Individual", instant: false },
] as const;

export type SignupRole = (typeof SIGNUP_ROLES)[number]["value"];

const bumped = new Set<string>();

/** Current sign-in state. `loading` is true until the stored session has been read. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (event === "SIGNED_IN" && next) {
        const token = next.access_token.slice(-12);
        if (!bumped.has(token)) {
          bumped.add(token);
          void supabase.rpc("bump_login_count");
          if (next.user.app_metadata?.provider !== "email") {
            void supabase.rpc("mark_email_verified_if_oauth");
          }
        }
      }
    });
    void supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const meta = (user?.user_metadata ?? {}) as { full_name?: string };
  return {
    session,
    user,
    loading,
    displayName: meta.full_name || user?.email?.split("@")[0] || "",
    signOut: () => supabase.auth.signOut(),
  };
}

/**
 * One-time email confirmation: an email/password account is sent to /verify-email
 * on its second sign-in, and never again once confirmed.
 */
export function useEmailVerificationGate(active: boolean) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!active || loading || !session) return;
    if (session.user.app_metadata?.provider !== "email") return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("login_count, email_verified_at")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        if ((data.login_count ?? 0) >= 2 && !data.email_verified_at) {
          void router.navigate({ to: "/verify-email", search: { verified: false } });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active, loading, session, router]);
}

/** Password rules used on sign-up, shown as a live checklist. */
export function passwordChecks(password: string, email: string) {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return [
    { id: "length", label: "At least 8 characters", ok: password.length >= 8 },
    { id: "letter", label: "Contains a letter", ok: /[A-Za-z]/.test(password) },
    { id: "number", label: "Contains a number", ok: /\d/.test(password) },
    {
      id: "distinct",
      label: "Different from your email name",
      ok: password.length > 0 && (local.length === 0 || password.toLowerCase() !== local),
    },
  ];
}

/** Friendly wording for the auth errors users actually hit. */
export function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (m.includes("user not found")) return "Email or password is incorrect.";
  if (m.includes("email not confirmed")) return "Confirm your email address first, then sign in.";
  if (m.includes("already registered")) return "That email already has an account. Sign in instead.";
  if (m.includes("same password") || m.includes("should be different"))
    return "Choose a password you have not used on this account before.";
  if (m.includes("expired") || m.includes("invalid token"))
    return "That link has expired. Request a new password reset email.";
  if (m.includes("pwned") || m.includes("breach"))
    return "That password appears in a known data breach. Choose a different one.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Wait a minute and try again.";
  if (m.includes("weak") || m.includes("easy to guess"))
    return "That password is too easy to guess. Choose a longer, less common one.";
  if (m.includes("not allowed") || m.includes("placeholder") || m.includes("reserved domain"))
    return "Use a real work email address: test domains such as example.com are not accepted.";
  if (m.includes("password")) return message;
  return "Something went wrong. Please try again.";
}
