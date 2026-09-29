import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { useOrigin } from "@/components/case/onboarding-tab";
import { Field, toastResult } from "@/components/common";
import { EmailPreview } from "@/components/email-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { actions, useAppState } from "@/lib/domain/store";

/**
 * Registers a new client: the advisor captures name, surname and email, the case (and its ID)
 * is created immediately, and the client's branded invitation — QR code, link and the exact
 * email they'll receive — is shown so the advisor can hand it over however suits the meeting.
 */
export function InviteClientDialog({
  open,
  onOpenChange,
  doneLabel,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doneLabel: string;
  onDone: (caseId: string) => void;
}) {
  const s = useAppState();
  const origin = useOrigin();
  const [form, setForm] = useState({ first: "", last: "", email: "" });
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);
  const link = created ? `${origin}/onboard/${created.code}` : "";
  const advisor = s.advisors[0];

  const create = () => {
    const name = `${form.first.trim()} ${form.last.trim()}`.trim();
    const r = actions.createCase({
      name,
      email: form.email,
      phone: "",
      advisorId: advisor?.id ?? "",
      entry: "advisor",
    });
    if (toastResult(r, "Invitation created") && r.ok && "caseId" in r) {
      setCreated({ id: r.caseId, code: r.code });
    }
  };

  const close = (o: boolean) => {
    if (!o) {
      setCreated(null);
      setForm({ first: "", last: "", email: "" });
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{created ? "Invitation sent" : "Register a new client"}</DialogTitle>
          <DialogDescription>
            {created
              ? "Share the QR code in person, or let the branded email do the work."
              : "Creates the client record and sends them a secure invitation to their own portal."}
          </DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-md border bg-white p-3">
                <QRCodeSVG value={link} size={140} />
              </div>
              <code className="w-full truncate rounded-md border bg-background px-3 py-2 text-xs">
                {link}
              </code>
            </div>
            <EmailPreview
              to={form.email}
              subject={`${form.first || "Your"} indigro client portal is ready`}
              heading={`Welcome, ${form.first || "there"}`}
              body={[
                `${advisor?.name ?? "Your wealth manager"} at ${s.fsp.name} has set up your secure client portal, where you'll review your financial plan, sign documents digitally and track your cover — all in one place.`,
                "Verifying your email keeps your information secure and takes onboarding under three minutes.",
              ]}
              ctaLabel="Verify my email address"
              fromOrg={s.fsp.name}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input
                  value={form.first}
                  onChange={(e) => setForm({ ...form, first: e.target.value })}
                  placeholder="First name"
                />
              </Field>
              <Field label="Surname">
                <Input
                  value={form.last}
                  onChange={(e) => setForm({ ...form, last: e.target.value })}
                  placeholder="Surname"
                />
              </Field>
            </div>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
          </div>
        )}
        <DialogFooter>
          {created ? (
            <Button
              onClick={() => {
                const id = created.id;
                close(false);
                onDone(id);
              }}
            >
              {doneLabel}
            </Button>
          ) : (
            <Button
              onClick={create}
              disabled={form.first.trim().length < 2 || form.last.trim().length < 2 || !form.email}
            >
              Create and send invitation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
