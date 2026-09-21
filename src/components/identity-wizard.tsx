import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, FileImage, Loader2, ShieldCheck, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACCEPTED_IMAGE_TYPES,
  isValidSaId,
  maskId,
  sameIdNumber,
  type IdCheckSummary,
} from "@/lib/didit";
import type { CaseRecord } from "@/lib/domain/types";
import { actions } from "@/lib/domain/store";
import { checkIdDocument, checkLiveness, identityConfigured } from "@/lib/identity.functions";
import { cn } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;

interface Picked {
  name: string;
  mime: string;
  b64: string;
  preview: string;
}

function readImage(file: File): Promise<Picked> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const url = String(reader.result);
      resolve({ name: file.name, mime: file.type, b64: url.split(",")[1] ?? "", preview: url });
    };
    reader.readAsDataURL(file);
  });
}

function checkFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Use a JPG, PNG or WebP image of your ID.";
  }
  if (file.size > MAX_BYTES) return "That image is larger than 8 MB. Use a smaller photo.";
  return null;
}

const STEPS = ["Upload your ID", "Liveness check"] as const;

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const current = step === n;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                done
                  ? "bg-positive text-white"
                  : current
                    ? "bg-brand text-brand-foreground"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </span>
            <span
              className={cn("font-medium", current ? "text-foreground" : "text-muted-foreground")}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={cn("h-px flex-1", done ? "bg-positive" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function DropFrame({
  picked,
  onPick,
  onError,
}: {
  picked: Picked | null;
  onPick: (p: Picked | null) => void;
  onError: (m: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  async function take(file: File | undefined) {
    if (!file) return;
    const problem = checkFile(file);
    if (problem) return onError(problem);
    try {
      onPick(await readImage(file));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not read that file.");
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void take(e.dataTransfer.files[0]);
      }}
      className={cn(
        "relative flex min-h-44 flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed p-4 text-center transition-colors",
        over ? "border-brand bg-brand-soft" : "border-input bg-background",
      )}
    >
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        aria-label="Upload your ID"
        onChange={(e) => void take(e.target.files?.[0])}
      />
      {picked ? (
        <>
          <img
            src={picked.preview}
            alt="Your ID, as uploaded"
            className="max-h-40 rounded-md border object-contain"
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileImage className="h-3.5 w-3.5" /> {picked.name}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => input.current?.click()}
            >
              Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onPick(null)}>
              <X /> Remove
            </Button>
          </div>
        </>
      ) : (
        <>
          <UploadCloud className="h-8 w-8 text-brand-ink" aria-hidden />
          <p className="text-sm font-medium">Drag and drop your ID here</p>
          <p className="text-xs text-muted-foreground">
            Smart ID card or ID book photo. JPG, PNG or WebP, up to 8 MB.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
            Browse files
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Two-step identity check for the client: (1) upload the ID document, (2) a liveness check with
 * a selfie. Both go to DIDIT through server functions; nothing about the images is stored.
 * When DIDIT has no key yet the wizard says so and offers a clearly labelled demonstration.
 */
export function IdentityWizard({ c, onClose }: { c: CaseRecord; onClose: () => void }) {
  const configuredFn = useServerFn(identityConfigured);
  const idFn = useServerFn(checkIdDocument);
  const liveFn = useServerFn(checkLiveness);
  const { data: cfg } = useQuery({
    queryKey: ["identity-configured"],
    queryFn: () => configuredFn(),
  });
  const demo = cfg?.configured === false;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [idNumber, setIdNumber] = useState(c.idNumber);
  const [idFile, setIdFile] = useState<Picked | null>(null);
  const [idResult, setIdResult] = useState<IdCheckSummary | null>(null);
  const [selfie, setSelfie] = useState<Picked | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");

  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const selfieInput = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCameraOn(false);
  }, []);
  useEffect(() => stopCamera, [stopCamera]);

  const digits = idNumber.replace(/\D/g, "");

  async function checkId() {
    setError("");
    if (!isValidSaId(digits)) return setError("Enter your 13-digit South African ID number.");
    if (!demo && !idFile) return setError("Add a photo of your ID first.");
    setBusy(true);
    try {
      if (demo) {
        setIdResult({
          status: "approved",
          documentNumber: digits,
          fullName: c.clientName,
          dateOfBirth: null,
          issuingState: "ZAF",
          problems: [],
          requestId: null,
        });
        return setStep(2);
      }
      const out = await idFn({ data: { imageBase64: idFile!.b64, mimeType: idFile!.mime } });
      if (!out.ok) return setError(out.message);
      const r = out.result;
      if (r.status !== "approved") {
        const why = r.problems.length
          ? r.problems.join(", ")
          : "the document could not be verified";
        actions.recordIdentityFailure(c.id, `ID document declined: ${why}`);
        return setError(
          `We couldn't verify that ID (${why}). Try a clearer photo of the whole card.`,
        );
      }
      if (!r.documentNumber)
        return setError("We couldn't read the ID number. Try a clearer photo.");
      if (!sameIdNumber(r.documentNumber, digits)) {
        actions.recordIdentityFailure(c.id, "ID document does not match the number entered");
        return setError("The ID number on the document doesn't match the number you entered.");
      }
      setIdResult(r);
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      stream.current = s;
      setCameraOn(true);
      // attach after the <video> mounts
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      });
    } catch {
      setError("We couldn't open your camera. Allow camera access, or upload a selfie instead.");
    }
  }

  function takeSelfie() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    const url = canvas.toDataURL("image/jpeg", 0.9);
    setSelfie({
      name: "selfie.jpg",
      mime: "image/jpeg",
      b64: url.split(",")[1] ?? "",
      preview: url,
    });
    stopCamera();
  }

  async function checkLive() {
    setError("");
    if (!idResult) return setError("Check your ID first.");
    if (!demo && !selfie) return setError("Take a selfie first.");
    setBusy(true);
    try {
      let livenessRequestId: string | null = null;
      if (!demo) {
        const out = await liveFn({ data: { imageBase64: selfie!.b64, mimeType: selfie!.mime } });
        if (!out.ok) return setError(out.message);
        if (out.result.status !== "approved") {
          const why = out.result.problems.length
            ? out.result.problems.join(", ")
            : "liveness not confirmed";
          actions.recordIdentityFailure(c.id, `Liveness declined: ${why}`);
          return setError(
            `We couldn't confirm it's you (${why}). Face the camera in good light and try again.`,
          );
        }
        livenessRequestId = out.result.requestId;
      }
      const res = actions.recordIdentityCheck(c.id, {
        documentNumber: idResult.documentNumber ?? digits,
        idRequestId: idResult.requestId,
        livenessRequestId,
        demo,
      });
      if (!res.ok) return setError(res.blockers.join(" "));
      setRef(demo ? "Demonstration only" : "Verified with DIDIT");
      setSelfie(null);
      setIdFile(null);
      setStep(3);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4 text-brand-ink" /> Verify your identity
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {step === 3 ? "Close" : "Cancel"}
        </button>
      </div>

      {step !== 3 && <StepIndicator step={step} />}

      {demo && (
        <p className="rounded-md border border-warning/30 bg-warning-soft p-3 text-xs">
          <strong>Demonstration.</strong> The identity service isn't connected yet, so nothing is
          actually checked and no images are used. An administrator adds the DIDIT key under Admin,
          APIs.
        </p>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">ID number (13 digits)</span>
            <Input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              inputMode="numeric"
              placeholder="8001015009087"
              autoComplete="off"
            />
          </label>
          <DropFrame picked={idFile} onPick={setIdFile} onError={setError} />
          <Button
            className="w-full"
            onClick={() => void checkId()}
            disabled={busy || cfg === undefined}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}{" "}
            {busy ? "Checking…" : demo ? "Continue (demo)" : "Check my ID"}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="rounded-md bg-background p-3 text-xs text-muted-foreground">
            ID checked: {idResult?.fullName ?? c.clientName},{" "}
            {maskId(idResult?.documentNumber ?? digits)}. Now a quick liveness check, so we know
            it's really you.
          </p>
          <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-[14px] border bg-navy">
            {cameraOn ? (
              <video
                ref={video}
                muted
                playsInline
                className="h-full max-h-72 w-full object-cover"
              />
            ) : selfie ? (
              <img
                src={selfie.preview}
                alt="Your selfie"
                className="max-h-72 w-full object-cover"
              />
            ) : (
              <p className="px-6 text-center text-xs text-navy-foreground/70">
                {demo
                  ? "Demo mode: no camera needed."
                  : "Use your camera, in good light, facing forward."}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {cameraOn ? (
              <Button type="button" onClick={takeSelfie}>
                <Camera /> Take selfie
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => void startCamera()}>
                <Camera /> {selfie ? "Retake" : "Open camera"}
              </Button>
            )}
            <input
              ref={selfieInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              className="sr-only"
              aria-label="Upload a selfie"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const problem = checkFile(f);
                if (problem) return setError(problem);
                stopCamera();
                setSelfie(await readImage(f));
              }}
            />
            <Button type="button" variant="ghost" onClick={() => selfieInput.current?.click()}>
              Upload a selfie instead
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopCamera();
                setStep(1);
              }}
              disabled={busy}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => void checkLive()}
              disabled={busy || cfg === undefined}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}{" "}
              {busy ? "Checking…" : demo ? "Finish (demo)" : "Check liveness"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center gap-2 rounded-md bg-positive-soft p-6 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-positive text-white">
            <Check className="h-5 w-5" />
          </span>
          <p className="font-medium">Identity verified</p>
          <p className="text-xs text-muted-foreground">{ref}. Your advisor has been notified.</p>
          <Button className="mt-2" onClick={onClose}>
            Continue
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
