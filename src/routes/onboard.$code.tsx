import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, ScanFace, ShieldAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AuthLayout } from "@/components/auth-layout";
import { Field, toastResult } from "@/components/common";
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
  const [single, setSingle] = useState<NeedId>("life");
  const [amount, setAmount] = useState("1000000");

  const verified = c.identity.livenessVerified;
  const hit = c.identity.sanctions === "hit";
  const disclosed = hasSig(c, "disclosure");
  const loa = hasSig(c, "loa");
  const routed = c.fnaMode !== "unset";
  const disclaimerOk = c.fnaMode !== "single-need" || hasSig(c, "single-need");
  const allDone = verified && !hit && disclosed && loa && routed && disclaimerOk;

  const runScan = () => {
    actions.updateProfile(c.id, {
      idNumber: profile.idNumber,
      age: Number(profile.age) || 35,
      monthlyNetIncome: Number(profile.net) || 0,
      smoker: profile.smoker,
      employment: profile.job,
    });
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      toastResult(actions.verifyIdentity(c.id), "Identity verified");
    }, 1400);
  };

  const active = !verified
    ? 1
    : hit
      ? 1
      : !disclosed
        ? 2
        : !loa
          ? 3
          : !routed
            ? 4
            : !disclaimerOk
              ? 5
              : 6;

  return (
    <AuthLayout
      wide
      title={allDone ? "You're all set" : `Welcome, ${c.clientName.split(" ")[0]}`}
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
        <Step
          n={1}
          title="Verify who you are"
          done={verified && !hit}
          active={active === 1 && !hit}
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
              disabled={scanning || profile.idNumber.replace(/\D/g, "").length !== 13}
            >
              {scanning ? <Loader2 className="animate-spin" /> : <ScanFace />}{" "}
              {scanning ? "Checking…" : "Start face and ID check"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Prototype: simulates the liveness and Home Affairs check. Nothing leaves your browser.
            </p>
          </div>
        </Step>
        <Step
          n={2}
          title="Read and sign your advisor's disclosure"
          done={disclosed}
          active={active === 2}
        >
          <p className="text-sm text-muted-foreground">
            Who your advisor is, who they work for, and how they are paid.
          </p>
          <SignButton caseId={c.id} kind="disclosure" label="Review and sign" size="default" />
        </Step>
        <Step
          n={3}
          title="Give permission to find your existing policies"
          done={loa}
          active={active === 3}
        >
          <p className="text-sm text-muted-foreground">
            A Letter of Authority lets your advisor look up policies you already have, so nothing is
            missed or duplicated.
          </p>
          <SignButton caseId={c.id} kind="loa" label="Review and sign" size="default" />
        </Step>
        <Step n={4} title="Tell us what you'd like help with" done={routed} active={active === 4}>
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
            n={5}
            title="Confirm you only want one thing quoted"
            done={disclaimerOk && c.fnaMode === "single-need"}
            active={active === 5}
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

  // An unknown or expired code has no page of its own: send the visitor to sign in.
  useEffect(() => {
    if (!c) void navigate({ to: "/login", replace: true });
  }, [c, navigate]);

  if (!c) return null;
  return <Wizard c={c} />;
}
