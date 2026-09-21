import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin > Integrations > APIs. Credential values are written to a table that is not readable
 * by the app role at all: only privileged server code can fetch a key to call a provider.
 * Everything the screen shows is metadata (status, hint, who rotated it and when).
 */

export interface IntegrationRow {
  id: string;
  name: string;
  category: string;
  description: string;
  baseUrl: string;
  environment: string;
  status: string;
  keyHint: string | null;
  lastRotatedAt: string | null;
  lastCheckedAt: string | null;
  updatedAt: string;
  hasCredential: boolean;
}

export interface CallLogRow {
  id: string;
  ts: string;
  integrationId: string;
  endpoint: string;
  outcome: string;
  latencyMs: number;
  detail: string;
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: unknown }>;
  };
  const { data } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Only administrators can manage API credentials");
}

export const listIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ integrations: IntegrationRow[]; log: CallLogRow[] }> => {
    const sb = context.supabase;
    const [rows, log, creds] = await Promise.all([
      sb.from("api_integrations").select("*").order("category").order("name"),
      sb.from("api_call_log").select("*").order("ts", { ascending: false }).limit(25),
      sb.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    void creds;

    return {
      integrations: (rows.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        description: r.description,
        baseUrl: r.base_url,
        environment: r.environment,
        status: r.status,
        keyHint: r.key_hint,
        lastRotatedAt: r.last_rotated_at,
        lastCheckedAt: r.last_checked_at,
        updatedAt: r.updated_at,
        hasCredential: r.status === "connected",
      })),
      log: (log.data ?? []).map((l) => ({
        id: l.id,
        ts: l.ts,
        integrationId: l.integration_id,
        endpoint: l.endpoint,
        outcome: l.outcome,
        latencyMs: l.latency_ms,
        detail: l.detail,
      })),
    };
  });

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: data === true };
  });

interface SaveKeyInput {
  integrationId: string;
  apiKey: string;
  environment: "sandbox" | "production";
  baseUrl?: string;
}

export const saveIntegrationKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SaveKeyInput) => {
    if (!input.integrationId) throw new Error("Choose an integration");
    if (input.apiKey.trim().length < 8) throw new Error("That key looks too short");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = data.apiKey.trim();
    const now = new Date().toISOString();

    const { error: credError } = await supabaseAdmin.from("api_credentials").upsert({
      integration_id: data.integrationId,
      secret_value: key,
      rotated_at: now,
      rotated_by: context.userId,
    });
    if (credError) throw new Error(credError.message);

    const { error } = await supabaseAdmin
      .from("api_integrations")
      .update({
        status: "connected",
        environment: data.environment,
        key_hint: `${key.slice(0, 3)}…${key.slice(-4)}`,
        last_rotated_at: now,
        updated_by: context.userId,
        updated_at: now,
        ...(data.baseUrl !== undefined ? { base_url: data.baseUrl } : {}),
      })
      .eq("id", data.integrationId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("api_call_log").insert({
      integration_id: data.integrationId,
      endpoint: "credential",
      outcome: "rotated",
      detail: "API key saved by an administrator",
    });

    return { ok: true as const };
  });

export const revokeIntegrationKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { integrationId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    await supabaseAdmin.from("api_credentials").delete().eq("integration_id", data.integrationId);
    await supabaseAdmin
      .from("api_integrations")
      .update({
        status: "not-configured",
        key_hint: null,
        last_rotated_at: null,
        updated_by: context.userId,
        updated_at: now,
      })
      .eq("id", data.integrationId);
    await supabaseAdmin.from("api_call_log").insert({
      integration_id: data.integrationId,
      endpoint: "credential",
      outcome: "revoked",
      detail: "API key removed by an administrator",
    });

    return { ok: true as const };
  });

/** Connection check: confirms a key is stored and, when a base URL is set, that the host answers. */
export const testIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { integrationId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const started = Date.now();

    const { data: cred } = await supabaseAdmin
      .from("api_credentials")
      .select("integration_id")
      .eq("integration_id", data.integrationId)
      .maybeSingle();
    const { data: integration } = await supabaseAdmin
      .from("api_integrations")
      .select("base_url")
      .eq("id", data.integrationId)
      .maybeSingle();

    let outcome = cred ? "ok" : "no-credential";
    let detail = cred ? "Credential present" : "No API key stored yet";

    if (cred && integration?.base_url) {
      try {
        const res = await fetch(integration.base_url, { method: "HEAD" });
        outcome = res.ok || res.status < 500 ? "ok" : "unreachable";
        detail = `Endpoint responded ${res.status}`;
      } catch (e) {
        outcome = "unreachable";
        detail = e instanceof Error ? e.message : "Endpoint did not respond";
      }
    }

    const latency = Date.now() - started;
    const now = new Date().toISOString();
    await supabaseAdmin.from("api_call_log").insert({
      integration_id: data.integrationId,
      endpoint: integration?.base_url ?? "",
      outcome,
      latency_ms: latency,
      detail,
    });
    await supabaseAdmin
      .from("api_integrations")
      .update({ last_checked_at: now, updated_at: now })
      .eq("id", data.integrationId);

    return { outcome, detail, latencyMs: latency };
  });
