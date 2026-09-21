import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState } from "react";

import { AuthLayout } from "@/components/auth-layout";
import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: `Sign up | ${BRAND.name}` }] }),
  component: Signup,
});

function Signup() {
  const [form, setForm] = useState({ name: "", email: "", fsp: "", fspNumber: "" });
  const [sent, setSent] = useState(false);
  const valid =
    form.name.trim().length > 2 && /\S+@\S+\.\S+/.test(form.email) && form.fsp.trim().length > 2;

  if (sent) {
    return (
      <AuthLayout title="Check your email">
        <div className="flex flex-col items-center gap-4 text-center text-sm">
          <MailCheck className="h-8 w-8 text-primary" />
          <p>
            We've sent a secure setup link to <strong>{form.email}</strong> to finish creating{" "}
            {form.fsp} on {BRAND.name}.
          </p>
          <p className="text-xs text-muted-foreground">Prototype: no email is actually sent.</p>
          <Link to="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      wide
      title={`Set up your agency on ${BRAND.name}`}
      subtitle="For FSP owners and Key Individuals. Advisors are invited afterwards."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) setSent(true);
        }}
      >
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
        <Button type="submit" className="w-full" disabled={!valid}>
          Continue
        </Button>
      </form>
      <p className="mt-5 text-center text-sm">
        Already have an agency?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
