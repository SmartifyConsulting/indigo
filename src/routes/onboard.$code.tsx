import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, ScanFace, ShieldAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth-layout";
import { Field, toastResult } from "@/components/common";
import { EmailPreview } from "@/components/email-preview";
import { SignButton } from "@/components/sign-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BRAND } from "@/lib/brand";
import { getDiditSessionDecision, startDiditSession } from "@/lib/didit-session.functions";
import { hasSig } from "@/lib/domain/gates";
import { needLabel } from "@/lib/domain/quotes";
import { actions, useAppState } from "@/lib/domain/store";
import type { CaseRecord, NeedId } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboard/$code")({
  head: () => ({ meta: [{ title: `Get started | ${BRAND.name}` }] }),
  component: Onboard,
});

const SINGLE: NeedId[] = [
  "life",
  "disability",
  "severe-illness",
  "vehicle",
  "home-building",
  "home-contents",
  "pet-cover",
];

function Step({
  n,
  title,
  done,
  active,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  active: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn("rounded-lg border p-4", active ? "border-primary bg-card" : "bg-background")}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
            done
              ? "bg-positive text-white"
              : active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground",
          )}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : n}
        </span>
        <p className={cn("text-sm font-medium", !done && !active && "text-muted-foreground")}>
          {title}
        </p>
      </div>
      {active && <div className="mt-4 space-y-3 pl-9">{children}</div>}
    </div>
  );
}

function Wizard({ c }: { c: CaseRecord }) {
  const s = useAppState();
  const navigate = useNavigate();
  const advisor = s.advisors.find((a) => a.id === c.advisorId);
  const [profile, setProfile] = useState({
    idNumber: c.idNumber,
    age: String(c.age),
    net: String(c.monthlyNetIncome || ""),
    smoker: c.smoker,
    job: c.employment,
  });
  const [scanning, setScanning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [single, setSingle] = useState<NeedId>("life");
  const [amount, setAmount] = useState("1000000");
  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState(c.email);

  const emailVerified = !!c.identity.emailVerifiedAt;
  const verified = c.identity.livenessVerified;
  const hit = c.identity.sanctions === "hit";
  const disclosed = hasSig(c, "disclosure");
  const loa = hasSig(c, "loa");
  const routed = c.fnaMode !== "unset";
  const disclaimerOk = c.fnaMode !== "single-need" || hasSig(c, "single-need");
  const allDone = verified && !hit && disclosed && loa && routed && disclaimerOk;

  // If we're coming back from a hosted Didit session (redirect round-trip), pick up its outcome.
  useEffect(() => {
    if (verified) return;
    const storageKey = `didit-session-${c.id}`;
    const sessionId = sessionStorage.getItem(storageKey);
    if (!sessionId) return;
    let cancelled = false;
    setChecking(true);
    const poll = () => {
      void getDiditSessionDecision({ data: { sessionId } }).then((result) => {
        if (cancelled) return;
        if (result.status === "pending") {
          setTimeout(poll, 3000);
          return;
        }
        sessionStorage.removeItem(storageKey);
        setChecking(false);
        if (result.status === "approved") {
          toastResult(actions.verifyIdentity(c.id), "Identity verified");
        } else if (result.status === "declined") {
          actions.recordIdentityFailure(c.id, result.reason ?? "Declined by Didit");
        } else {
          toast.error(result.message);
        }
      });
    };
    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id, verified]);

  const runScan = async () => {
    actions.updateProfile(c.id, {
      idNumber: profile.idNumber,
      age: Number(profile.age) || 35,
      monthlyNetIncome: Number(profile.net) || 0,
      smoker: profile.smoker,
      employment: profile.job,
    });
    setScanning(true);
    const result = await startDiditSession({
      data: { caseId: c.id, callback: `${window.location.origin}${window.location.pathname}` },
    });
    if (result.mode === "live") {
      sessionStorage.setItem(`didit-session-${c.id}`, result.sessionId);
      window.location.href = result.url;
      return;
    }
    if (result.mode === "error") {
      setScanning(false);
      toast.error(result.message);
      return;
    }
    // Not connected: fall back to the onboarding demo's simulated check.
    setTimeout(() => {
      setScanning(false);
      toastResult(actions.verifyIdentity(c.id), "Identity verified");
    }, 1400);
  };

  const active = !emailVerified
    ? 1
    : !verified
      ? 2
      : hit
        ? 2
        : !disclosed
          ? 3
          : !loa
            ? 4
            : !routed
              ? 5
              : !disclaimerOk
                ? 6
                : 7;

  return (
    <AuthLayout
      wide
      title={allDone ? "You're All Set" : `Welcome, ${c.clientName.split(" ")[0]}`}
      subtitle={
        allDone
          ? undefined
          : `${advisor?.name} at ${s.fsp.name} has invited you to get started. This takes about three minutes.`
      }
    >
      {hit && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-negative/30 bg-negative-soft p-3 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
          <p>
            We couldn't complete your verification automatically. Your advisor's compliance team
            will contact you.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Step n={1} title="Verify your email address" done={emailVerified} active={active === 1}>
          <p className="text-sm text-muted-foreground">
            We sent an invitation to <strong className="text-foreground">{c.email}</strong>.
            Confirming it's you keeps your information secure.
          </p>
          {editingEmail ? (
            <div className="flex items-end gap-2">
              <Field label="Email address" hint="We'll resend the invitation to this address.">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </Field>
              <Button
                size="sm"
                disabled={!email.includes("@")}
                onClick={() => {
                  toastResult(actions.updateProfile(c.id, { email }), "Email updated");
                  setEditingEmail(false);
                }}
              >
                Save
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingEmail(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Not your email address?
            </button>
          )}
          <EmailPreview
            to={c.email}
            subject={`${c.clientName.split(" ")[0]}, your indigro client portal is ready`}
            heading={`Welcome, ${c.clientName.split(" ")[0]}`}
            body={[
              `${advisor?.name ?? "Your wealth manager"} at ${s.fsp.name} has set up your secure client portal, where you'll review your financial plan, sign documents digitally and track your cover — all in one place.`,
              "Verifying your email keeps your information secure and takes onboarding under three minutes.",
            ]}
            ctaLabel="Verify my email address"
            onCta={() => toastResult(actions.verifyEmail(c.id), "Email verified")}
            fromOrg={s.fsp.name}
          />
        </Step>
        <Step
          n={2}
          title="Verify who you are"
          done={verified && !hit}
          active={active === 2 && !hit}
        >
          <div className="grid gap-3">
            <Field label="ID number">
              <Input
                value={profile.idNumber}
                onChange={(e) => setProfile({ ...profile, idNumber: e.target.value })}
                placeholder="13 digits"
                inputMode="numeric"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <Input
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                />
              </Field>
              <Field label="Monthly take-home (R)">
                <Input
                  type="number"
                  value={profile.net}
                  onChange={(e) => setProfile({ ...profile, net: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Occupation">
              <Input
                value={profile.job}
                onChange={(e) => setProfile({ ...profile, job: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={profile.smoker}
                onCheckedChange={(v) => setProfile({ ...profile, smoker: v })}
              />{" "}
              I smoke
            </label>
            <Button
              onClick={runScan}
              disabled={scanning || checking || profile.idNumber.replace(/\D/g, "").length !== 13}
            >
              {scanning || checking ? <Loader2 className="animate-spin" /> : <ScanFace />}{" "}
              {checking ? "Confirming your check…" : scanning ? "Starting…" : "Start face and ID check"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {checking
                ? "Finishing up with Didit — this only takes a few seconds."
                : "You'll be sent to Didit's secure verification flow, then brought back here automatically."}
            </p>
          </div>
        </Step>
        <Step
          n={3}
          title="Read and sign your advisor's disclosure"
          done={disclosed}
          active={active === 3}
        >
          <p className="text-sm text-muted-foreground">
            Who your advisor is, who they work for, and how they are paid.
          </p>
          <SignButton caseId={c.id} kind="disclosure" label="Review and sign" size="default" />
        </Step>
        <Step
          n={4}
          title="Give permission to find your existing policies"
          done={loa}
          active={active === 4}
        >
          <p className="text-sm text-muted-foreground">
            A Letter of Authority lets your advisor look up policies you already have, so nothing is
            missed or duplicated.
          </p>
          <SignButton caseId={c.id} kind="loa" label="Review and sign" size="default" />
        </Step>
        <Step n={5} title="Tell us what you'd like help with" done={routed} active={active === 5}>
          <div className="space-y-3">
            <button
              onClick={() => toastResult(actions.chooseRoute(c.id, "full"))}
              className="w-full rounded-md border p-3 text-left text-sm hover:border-primary"
            >
              <span className="block font-medium">A full review of my finances</span>
              <span className="text-xs text-muted-foreground">
                Recommended. Looks at life, short-term and investment cover together.
              </span>
            </button>
            <div className="rounded-md border p-3 text-sm">
              <span className="block font-medium">Just one thing</span>
              <div className="mt-2 flex flex-wrap gap-2">
                <Select value={single} onValueChange={(v) => setSingle(v as NeedId)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SINGLE.map((n) => (
                      <SelectItem key={n} value={n}>
                        {needLabel(n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="w-32"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-label="Cover amount"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    toastResult(
                      actions.chooseRoute(c.id, "single-need", {
                        needId: single,
                        amount: Number(amount),
                      }),
                    )
                  }
                >
                  Choose
                </Button>
              </div>
            </div>
          </div>
        </Step>
        {c.fnaMode === "single-need" && (
          <Step
            n={6}
            title="Confirm you only want one thing quoted"
            done={disclaimerOk && c.fnaMode === "single-need"}
            active={active === 6}
          >
            <p className="text-sm text-muted-foreground">
              Advice on a single need may not cover your wider situation. You can ask for a full
              review at any time.
            </p>
            <SignButton caseId={c.id} kind="single-need" label="Review and sign" size="default" />
          </Step>
        )}
      </div>
      {allDone && (
        <div className="mt-6 space-y-3 text-center text-sm">
          <p>Thank you. Your advisor has been notified and will take it from here.</p>
          <Button
            className="w-full"
            onClick={() => {
              actions.setRole("client");
              actions.setClientCase(c.id);
              void navigate({ to: "/" });
            }}
          >
            Go to my portal
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}

function Onboard() {
  const { code } = Route.useParams();
  const s = useAppState();
  const navigate = useNavigate();
  const c = s.cases.find((x) => x.code === code);
  const id = c?.id;

  // The person on this page is the client: attribute their actions to them in the audit ledger.
  useEffect(() => {
    if (id) {
      actions.setRole("client");
      actions.setClientCase(id);
    }
  }, [id]);

  // An unknown or expired code has no page of its own: send the visitor to the home page.
  useEffect(() => {
    if (!c) void navigate({ to: "/welcome", replace: true });
  }, [c, navigate]);

  if (!c) return null;
  return <Wizard c={c} />;
}
