import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  FileSignature,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";
import { mapAuthError, useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name}: compliance-driven advice for wealth managers` },
      { name: "description", content: BRAND.tagline },
      { property: "og:title", content: `${BRAND.name}: compliance-driven advice` },
      { property: "og:description", content: BRAND.tagline },
    ],
  }),
  component: Landing,
});

const HIGHLIGHTS = [
  {
    icon: Workflow,
    title: "One advice journey",
    body: "Intake, needs analysis, quotes, advice record and application in a single guided flow.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance built in",
    body: "Every step is gated, time-stamped and written to a tamper-evident audit trail.",
  },
  {
    icon: FileSignature,
    title: "Signed and filed",
    body: "Client signatures, ROAs and supporting documents stored against the case automatically.",
  },
  {
    icon: BadgeCheck,
    title: "Connected providers",
    body: "Astute, identity checks, insurer quoting and your CRM, with costs tracked per call.",
  },
];

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="wordmark text-2xl">{BRAND.name}</span>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-8 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            FAIS-aligned advice workspace
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Advice your clients trust, evidence your regulator accepts.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            {BRAND.name} takes a wealth manager from first conversation to signed application
            without leaving a compliance gap: gated stages, recorded advice, and a hashed audit
            trail behind every recommendation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup">
              <Button size="lg">
                Create your workspace <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                I already have an account
              </Button>
            </Link>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t pt-6">
            <Stat value="9 stages" label="from intake to issue" />
            <Stat value="10 APIs" label="data, identity, insurers, CRM" />
            <Stat value="100%" label="of actions audited" />
          </dl>
        </div>

        <HeroSignIn />
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2">
          {HIGHLIGHTS.map((h) => (
            <Card key={h.title}>
              <CardContent className="space-y-2 p-6">
                <h.icon className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">{h.title}</p>
                <p className="text-sm text-muted-foreground">{h.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground">
        <span>
          {BRAND.name} — {BRAND.tagline}
        </span>
        <Link to="/signup" className="text-primary hover:underline">
          Get started
        </Link>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-xl font-semibold text-foreground">{value}</dt>
      <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
    </div>
  );
}

function HeroSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      const msg = mapAuthError(err.message);
      setError(msg);
      toast.error(msg);
      return;
    }
    void navigate({ to: "/dashboard" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Google sign-in could not be started.");
  }

  return (
    <Card className="lg:sticky lg:top-10">
      <CardContent className="p-6">
        <p className="text-sm font-semibold">Sign in</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick up where your advice cases left off.
        </p>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="hero-email">Work email</Label>
            <Input
              id="hero-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hero-password">Password</Label>
            <div className="relative">
              <Input
                id="hero-password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                className="pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </div>
          {error && (
            <p aria-live="polite" className="text-sm text-negative">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <div className="flex items-center justify-between text-xs">
            <Link to="/forgot-password" tabIndex={-1} className="text-primary hover:underline">
              Forgot password?
            </Link>
            <Link to="/signup" className="text-primary hover:underline">
              Create an account
            </Link>
          </div>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={() => void google()}>
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  );
}
