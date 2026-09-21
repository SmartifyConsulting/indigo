import { PenLine } from "lucide-react";
import { useState } from "react";

import { toastResult } from "@/components/common";
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
import { SIGNATURE_LABEL, type SignatureKind } from "@/lib/domain/types";

const DOCUMENT_TEXT: Record<SignatureKind, string[]> = {
  disclosure: [
    "I acknowledge that my advisor and their Financial Services Provider (FSP) have disclosed their licence details, product suppliers, remuneration and any conflicts of interest before giving me any advice or quotes.",
    "I understand I may request a copy of this disclosure at any time.",
  ],
  loa: [
    "I authorise my advisor and FSP to request information about my existing policies and investments from product suppliers, including through the Astute Financial Services Exchange, for the purpose of giving me financial advice.",
    "This authority may be withdrawn in writing at any time and is recorded under POPIA consent.",
  ],
  "single-need": [
    "I have chosen not to have a full financial needs analysis performed. I want quotes for one specific need only.",
    "I understand that advice limited to a single need may not address my wider financial position and that I may request a full analysis at any time.",
  ],
  mandate: [
    "Another financial services provider has queried my policy information. I confirm the authority I give to my current advisor and FSP, and I authorise the release of my portfolio data to them under this updated mandate.",
  ],
  roa: [
    "I have received and reviewed this Record of Advice, including the recommended products, the premiums and the advisor's affordability assessment.",
    "I understand that if any option changes, a new version will be issued and I will be asked to sign again.",
  ],
  "debit-order": [
    "I authorise the product suppliers named in my Record of Advice to collect the monthly premiums shown, on the agreed dates, from my nominated bank account.",
  ],
  "life-declaration": [
    "I declare that the information I have given for these applications is true and complete, and I understand that non-disclosure of material information may affect a claim.",
  ],
};

export function SignDialog({
  caseId,
  kind,
  open,
  onOpenChange,
  onSigned,
}: {
  caseId: string;
  kind: SignatureKind;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSigned?: () => void;
}) {
  const s = useAppState();
  const c = s.cases.find((x) => x.id === caseId);
  const [name, setName] = useState("");
  if (!c) return null;

  const submit = () => {
    const r = actions.sign(caseId, kind, name);
    if (toastResult(r, `${SIGNATURE_LABEL[kind]} signed`)) {
      setName("");
      onOpenChange(false);
      onSigned?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{SIGNATURE_LABEL[kind]}</DialogTitle>
          <DialogDescription>
            {s.fsp.name} ({s.fsp.fspNumber})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-md border bg-background p-4 text-sm">
          {DOCUMENT_TEXT[kind].map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Type your full legal name to sign:{" "}
            <span className="text-foreground">{c.clientName}</span>
          </span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={c.clientName}
            autoComplete="off"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Your signature is time-stamped and fingerprinted (SHA-256) into the audit ledger.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={name.trim().length < 3}>
            <PenLine /> Sign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small helper so a button can open its own sign dialog. */
export function SignButton({
  caseId,
  kind,
  label,
  variant,
  size,
  disabled,
}: {
  caseId: string;
  kind: SignatureKind;
  label?: string;
  variant?: "default" | "outline";
  size?: "sm" | "default";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant ?? "default"}
        size={size ?? "sm"}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <PenLine /> {label ?? "Sign"}
      </Button>
      <SignDialog caseId={caseId} kind={kind} open={open} onOpenChange={setOpen} />
    </>
  );
}
