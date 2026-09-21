import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/** Current sign-in state. `loading` is true until the stored session has been read. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
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

/** Friendly wording for the auth errors users actually hit. */
export function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (m.includes("email not confirmed")) return "Confirm your email address first, then sign in.";
  if (m.includes("already registered")) return "That email already has an account. Sign in instead.";
  if (m.includes("pwned") || m.includes("breach"))
    return "That password appears in a known data breach. Choose a different one.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Wait a minute and try again.";
  if (m.includes("password")) return message;
  return "Something went wrong. Please try again.";
}
