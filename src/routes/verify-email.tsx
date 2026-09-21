import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { MailCheck, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";
import { mapAuthError, useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>) => ({
    verified: s["verified"] === "1" || s["verified"] === true,
  }),
  head: () => ({
    meta: [
      { title: `Confirm your email | ${BRAND.name}` },
      { name: "description", content: "One-time email confirmation for your account." },
      { property: "og:title", content: `Confirm your email | ${BRAND.name}` },
      { property: "og:description", content: "One-time email confirmation for your account." },
    ],
  }),
  component: VerifyEmail,
});

function VerifyEmail() {
  const { verified } = useSearch({ from: "/verify-email" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!verified) return;
    void supabase.rpc("mark_email_verified").then(() => {
      setDone(true);
      toast.success("Email confirmed.");
      setTimeout(() => void navigate({ to: "/dashboard" }), 1200);
    });
  }, [verified, navigate]);

  async function send() {
    if (!user?.email) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { emailRedirectTo: `${window.location.origin}/verify-email?verified=1` },
    });
    setBusy(false);
    if (error) {
      toast.error(mapAuthError(error.message));
      return;
    }
    setSent(true);
  }

  if (done) {
    return (
      <AuthLayout title="Email confirmed">
        <div className="flex flex-col items-center gap-3 text-center text-sm">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <p>Thank you. Taking you to your workspace…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Confirm your email once"
      subtitle="A one-off check so we know we can reach you about your advice records."
    >
      <div className="flex flex-col items-center gap-4 text-center text-sm">
        <MailCheck className="h-8 w-8 text-primary" />
        {sent ? (
          <p>
            We sent a confirmation link to <strong>{user?.email}</strong>. Open it on this device to
            finish.
          </p>
        ) : (
          <p>
            We will send a confirmation link to <strong>{user?.email}</strong>. You only need to do
            this once.
          </p>
        )}
        <Button onClick={() => void send()} disabled={busy} className="w-full">
          {busy ? "Sending…" : sent ? "Send it again" : "Send the confirmation link"}
        </Button>
      </div>
    </AuthLayout>
  );
}
