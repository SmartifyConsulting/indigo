import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ACCEPTED_IMAGE_TYPES,
  DIDIT_BASE,
  ID_CHECK_PATH,
  LIVENESS_PATH,
  MAX_BASE64_LENGTH,
  summariseIdResponse,
  summariseLivenessResponse,
  type IdCheckSummary,
  type LivenessSummary,
} from "@/lib/didit";

/**
 * Identity checks against DIDIT. The API key stays on the server: it is read from the
 * credential vault with the admin client and never reaches the browser. The images a person
 * uploads are forwarded to DIDIT and dropped: nothing about them is stored here, and the call
 * log records only the outcome, never names, numbers or pictures.
 */

export type CheckFailure = {
  ok: false;
  reason: "not-configured" | "invalid" | "error";
  message: string;
};
export type IdCheckOutcome = { ok: true; result: IdCheckSummary } | CheckFailure;
export type LivenessOutcome = { ok: true; result: LivenessSummary } | CheckFailure;

interface ImageInput {
  imageBase64: string;
  mimeType: string;
}

function validate(input: ImageInput): CheckFailure | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(input.mimeType)) {
    return { ok: false, reason: "invalid", message: "Use a JPG, PNG or WebP image." };
  }
  if (!input.imageBase64 || input.imageBase64.length > MAX_BASE64_LENGTH) {
    return { ok: false, reason: "invalid", message: "The image is missing or larger than 10 MB." };
  }
  return null;
}

async function loadKey(): Promise<string | null> {
  // A local checkout has no service-role key, so there is no vault to read: treat as not connected.
  if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("api_credentials")
    .select("secret_value")
    .eq("integration_id", "didit")
    .maybeSingle();
  // A failed lookup must not read as "not connected", or a real outage would fall into demo mode.
  if (error) throw new Error("Could not read the identity service credentials.");
  return data?.secret_value ?? null;
}

async function record(endpoint: string, outcome: string, latencyMs: number, detail: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("api_call_log").insert({
    integration_id: "didit",
    endpoint,
    outcome,
    latency_ms: latencyMs,
    detail,
  });
}

async function callDidit(
  path: string,
  field: "front_image" | "user_image",
  input: ImageInput,
): Promise<{ json: unknown } | CheckFailure> {
  const key = await loadKey();
  if (!key) {
    return {
      ok: false,
      reason: "not-configured",
      message: "DIDIT is not connected yet. An administrator adds the key under Admin, APIs.",
    };
  }

  const bytes = Uint8Array.from(atob(input.imageBase64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append(
    field,
    new Blob([bytes], { type: input.mimeType }),
    field === "front_image" ? "id" : "selfie",
  );
  form.append("save_api_request", "false");

  const started = Date.now();
  try {
    const res = await fetch(`${DIDIT_BASE}${path}`, {
      method: "POST",
      headers: { "x-api-key": key },
      body: form,
    });
    const json: unknown = await res.json().catch(() => null);
    const ms = Date.now() - started;
    if (!res.ok) {
      await record(path, `http-${res.status}`, ms, `DIDIT answered ${res.status}`);
      return {
        ok: false,
        reason: "error",
        message: "The identity service could not process that image. Try a clearer photo.",
      };
    }
    await record(path, "ok", ms, "Check completed");
    return { json };
  } catch (e) {
    await record(
      path,
      "unreachable",
      Date.now() - started,
      e instanceof Error ? e.name : "Request failed",
    );
    return {
      ok: false,
      reason: "error",
      message: "The identity service did not respond. Please try again.",
    };
  }
}

/** Whether an administrator has stored a DIDIT key. Lets the wizard say so instead of failing. */
export const identityConfigured = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ configured: boolean }> => ({
    configured: (await loadKey()) !== null,
  }));

/** Step 1: check the uploaded ID document. */
export const checkIdDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ImageInput) => input)
  .handler(async ({ data }): Promise<IdCheckOutcome> => {
    const bad = validate(data);
    if (bad) return bad;
    const out = await callDidit(ID_CHECK_PATH, "front_image", data);
    return "json" in out ? { ok: true, result: summariseIdResponse(out.json) } : out;
  });

/** Step 2: passive liveness check on a selfie. */
export const checkLiveness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ImageInput) => input)
  .handler(async ({ data }): Promise<LivenessOutcome> => {
    const bad = validate(data);
    if (bad) return bad;
    const out = await callDidit(LIVENESS_PATH, "user_image", data);
    return "json" in out ? { ok: true, result: summariseLivenessResponse(out.json) } : out;
  });
