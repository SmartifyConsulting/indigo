import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth-layout";
import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";
import { mapAuthError } from "@/lib/use-auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: `Choose a new password | ${BRAND.name}` },
      { name: "description", content: "Set a new password for your account." },
      { property: "og:title", content: `Choose a new password | ${BRAND.name}` },
      { property: "og:description", content: "Set a new password for your account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const strong = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

  return (
    <AuthLayout title="Choose a new password" subtitle="At least 8 characters, with a number.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!strong) {
            setError("Use at least 8 characters, including a letter and a number.");
            return;
          }
          setBusy(true);
          setError("");
          void supabase.auth.updateUser({ password }).then(({ error: err }) => {
            setBusy(false);
            if (err) {
              const msg = mapAuthError(err.message);
              setError(msg);
              toast.error(msg);
              return;
            }
            toast.success("Password updated");
            void navigate({ to: "/" });
          });
        }}
      >
        <Field label="New password">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="pr-10"
              required
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
        {error && (
          <p aria-live="polite" className="text-sm text-negative">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
