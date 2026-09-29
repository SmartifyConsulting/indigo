import { createServerFn } from "@tanstack/react-start";

import { DIDIT_BASE, DIDIT_WORKFLOW_ID } from "@/lib/didit";

/**
 * Hosted Didit verification sessions (the Workflow API), used for the client's face-and-ID check
 * during onboarding. Callable from the public /onboard/$code page, which has no Supabase session
 * of its own, so these do not gate on requireSupabaseAuth like the admin-side identity checks do.
 * The API key stays on the server, read from the credential vault with the admin client. A local
 * checkout with no service-role key has no vault to read: callers fall back to the onboarding
 * demo's simulated check instead of failing the step.
 */

async function loadKey(): Promise<string | null> {
  if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("api_credentials")
    .select("secret_value")
    .eq("integration_id", "didit")
    .maybeSingle();
  if (error) throw new Error("Could not read the identity service credentials.");
  return data?.secret_value ?? null;
}

export type DiditSessionResult =
  | { mode: "demo" }
  | { mode: "live"; sessionId: string; url: string }
  | { mode: "error"; message: string };

/** Starts a hosted verification session for a case and returns the URL to send the client to. */
export const startDiditSession = createServerFn({ method: "POST" })
  .inputValidator((input: { caseId: string; callback: string }) => input)
  .handler(async ({ data }): Promise<DiditSessionResult> => {
    const key = await loadKey();
    if (!key) return { mode: "demo" };

    try {
      const res = await fetch(`${DIDIT_BASE}/v2/session/`, {
        method: "POST",
        headers: { "x-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: DIDIT_WORKFLOW_ID,
          vendor_data: data.caseId,
          callback: data.callback,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { session_id?: string; url?: string }
        | null;
      if (!res.ok || !json?.session_id || !json.url) {
        return { mode: "error", message: `Didit could not start a session (HTTP ${res.status}).` };
      }
      return { mode: "live", sessionId: json.session_id, url: json.url };
    } catch {
      return { mode: "error", message: "Could not reach the identity service. Try again." };
    }
  });

export type DiditDecisionResult =
  | { status: "pending" }
  | { status: "approved" }
  | { status: "declined"; reason?: string }
  | { status: "error"; message: string };

/** Polls a hosted session for its outcome once the client returns from the Didit-hosted flow. */
export const getDiditSessionDecision = createServerFn({ method: "POST" })
  .inputValidator((input: { sessionId: string }) => input)
  .handler(async ({ data }): Promise<DiditDecisionResult> => {
    const key = await loadKey();
    if (!key) return { status: "error", message: "Didit is not connected." };

    try {
      const res = await fetch(`${DIDIT_BASE}/v2/session/${data.sessionId}/decision/`, {
        headers: { "x-api-key": key },
      });
      const json = (await res.json().catch(() => null)) as { status?: string } | null;
      if (!res.ok) return { status: "error", message: `Didit answered ${res.status}.` };
      const status = (json?.status ?? "").toLowerCase();
      if (status === "approved") return { status: "approved" };
      if (["declined", "abandoned", "expired", "kyc_expired"].includes(status)) {
        return { status: "declined", reason: status };
      }
      return { status: "pending" };
    } catch {
      return { status: "error", message: "Could not reach the identity service." };
    }
  });
