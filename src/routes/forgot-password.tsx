import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth-layout";
import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";
import { mapAuthError } from "@/lib/use-auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: `Reset your password | ${BRAND.name}` },
      { name: "description", content: "Request a password reset link for your account." },
      { property: "og:title", content: `Reset your password | ${BRAND.name}` },
      { property: "og:description", content: "Request a password reset link for your account." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (sent) {
    return (
      <AuthLayout title="Check your email">
        <div className="flex flex-col items-center gap-4 text-center text-sm">
          <MailCheck className="h-8 w-8 text-primary" />
          <p>
            If an account exists for <strong>{email}</strong>, a reset link is on its way.
          </p>
          <Link to="/welcome" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a secure link.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void supabase.auth
            .resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/reset-password`,
            })
            .then(({ error }) => {
              setBusy(false);
              if (error) toast.error(mapAuthError(error.message));
              else setSent(true);
            });
        }}
      >
        <Field label="Work email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm">
        <Link to="/welcome" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
