import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin > Integrations. Credential values live in a table the app role cannot read at all —
 * only privileged server code touches it. The screen shows metadata plus, on an explicit
 * reveal, the stored values.
 */

export interface IntegrationRow {
  id: string;
  name: string;
  category: string;
  description: string;
  baseUrl: string;
  environment: string;
  status: string;
  enabled: boolean;
  keyHint: string | null;
  unitPrice: number | null;
  unitLabel: string;
  topUpUrl: string;
  docsUrl: string;
  portalUrl: string;
  portalUsername: string;
  lastRotatedAt: string | null;
  lastCheckedAt: string | null;
  updatedAt: string;
  /** Which secret fields currently hold a value. */
  filledSecrets: string[];
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
  if (!data) throw new Error("This area is restricted to administrators");
}

export const listIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ integrations: IntegrationRow[]; log: CallLogRow[] }> => {
    const sb = context.supabase;
    const [rows, log] = await Promise.all([
      sb.from("api_integrations").select("*").order("category").order("name"),
      sb.from("api_call_log").select("*").order("ts", { ascending: false }).limit(25),
    ]);

    // Which fields hold a secret: keys only, never values.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: secrets } = await supabaseAdmin
      .from("api_secrets")
      .select("integration_id, field_key");
    const filled = new Map<string, string[]>();
    for (const s of secrets ?? []) {
      const list = filled.get(s.integration_id) ?? [];
      list.push(s.field_key);
      filled.set(s.integration_id, list);
    }

    return {
      integrations: (rows.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        description: r.description,
        baseUrl: r.base_url,
        environment: r.environment,
        status: r.status,
        enabled: r.enabled,
        keyHint: r.key_hint,
        unitPrice: r.unit_price === null ? null : Number(r.unit_price),
        unitLabel: r.unit_label,
        topUpUrl: r.top_up_url,
        docsUrl: r.docs_url,
        portalUrl: r.portal_url,
        portalUsername: r.portal_username,
        lastRotatedAt: r.last_rotated_at,
        lastCheckedAt: r.last_checked_at,
        updatedAt: r.updated_at,
        filledSecrets: filled.get(r.id) ?? [],
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

interface SaveInput {
  integrationId: string;
  enabled: boolean;
  environment: string;
  baseUrl: string;
  portalUrl: string;
  portalUsername: string;
  topUpUrl: string;
  docsUrl: string;
  unitPrice: number | null;
  unitLabel: string;
  /** Blank values keep whatever is already stored. */
  secrets: Record<string, string>;
}

export const saveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SaveInput) => {
    if (!input.integrationId) throw new Error("Choose a service");
    if (input.unitPrice !== null && (Number.isNaN(input.unitPrice) || input.unitPrice < 0))
      throw new Error("The price per unit must be a positive amount");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    const entries = Object.entries(data.secrets).filter(([, v]) => v.trim().length > 0);
    if (entries.length > 0) {
      const { error } = await supabaseAdmin.from("api_secrets").upsert(
        entries.map(([field_key, value]) => ({
          integration_id: data.integrationId,
          field_key,
          secret_value: value.trim(),
          rotated_at: now,
          rotated_by: context.userId,
        })),
      );
      if (error) throw new Error(error.message);
    }

    const { data: stored } = await supabaseAdmin
      .from("api_secrets")
      .select("field_key, secret_value")
      .eq("integration_id", data.integrationId);
    const primary =
      stored?.find((s) => s.field_key === "api_key") ?? stored?.[0] ?? null;
    const hint = primary
      ? `${primary.secret_value.slice(0, 3)}…${primary.secret_value.slice(-4)}`
      : null;

    const { error } = await supabaseAdmin
      .from("api_integrations")
      .update({
        enabled: data.enabled,
        environment: data.environment,
        base_url: data.baseUrl,
        portal_url: data.portalUrl,
        portal_username: data.portalUsername,
        top_up_url: data.topUpUrl,
        docs_url: data.docsUrl,
        unit_price: data.unitPrice,
        unit_label: data.unitLabel,
        status: stored && stored.length > 0 ? "connected" : "not-configured",
        key_hint: hint,
        ...(entries.length > 0 ? { last_rotated_at: now } : {}),
        updated_by: context.userId,
        updated_at: now,
      })
      .eq("id", data.integrationId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("api_call_log").insert({
      integration_id: data.integrationId,
      endpoint: "credential",
      outcome: entries.length > 0 ? "rotated" : "updated",
      detail:
        entries.length > 0
          ? `${entries.length} credential field(s) saved by an administrator`
          : "Settings updated by an administrator",
    });

    return { ok: true as const };
  });

/** Explicit, logged reveal of the stored values for one service. */
export const revealIntegrationSecrets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { integrationId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("api_secrets")
      .select("field_key, secret_value")
      .eq("integration_id", data.integrationId);

    await supabaseAdmin.from("api_call_log").insert({
      integration_id: data.integrationId,
      endpoint: "credential",
      outcome: "revealed",
      detail: "Stored credentials revealed by an administrator",
    });

    return {
      values: Object.fromEntries((rows ?? []).map((r) => [r.field_key, r.secret_value])),
    };
  });

export const revokeIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { integrationId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    await supabaseAdmin.from("api_secrets").delete().eq("integration_id", data.integrationId);
    await supabaseAdmin
      .from("api_integrations")
      .update({
        status: "not-configured",
        enabled: false,
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
      detail: "Credentials removed by an administrator",
    });

    return { ok: true as const };
  });

/** Connection check: confirms a credential is stored and, with a base URL, that the host answers. */
export const testIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { integrationId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const started = Date.now();

    const [{ data: cred }, { data: integration }] = await Promise.all([
      supabaseAdmin
        .from("api_secrets")
        .select("field_key")
        .eq("integration_id", data.integrationId)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("api_integrations")
        .select("base_url")
        .eq("id", data.integrationId)
        .maybeSingle(),
    ]);

    let outcome = cred ? "ok" : "no-credential";
    let detail = cred ? "Credential present" : "No credentials stored yet";

    if (cred && integration?.base_url) {
      try {
        const res = await fetch(integration.base_url, { method: "HEAD" });
        outcome = res.status < 500 ? "ok" : "unreachable";
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

export interface CostMonth {
  month: string; // YYYY-MM
  calls: number;
  failed: number;
  cost: number | null;
}

export interface CostRow {
  id: string;
  name: string;
  category: string;
  unitPrice: number | null;
  unitLabel: string;
  currentCalls: number;
  currentCost: number | null;
  totalCalls: number;
  totalCost: number | null;
  months: CostMonth[];
}

/** Running cost per service, measured from the calls the platform actually recorded. */
export const integrationCostReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rows: CostRow[]; months: string[] }> => {
    await assertAdmin(context);
    const sb = context.supabase;

    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 11, 1);
    since.setUTCHours(0, 0, 0, 0);

    const [{ data: integrations }, { data: calls }] = await Promise.all([
      sb.from("api_integrations").select("id, name, category, unit_price, unit_label").order("name"),
      sb
        .from("api_call_log")
        .select("integration_id, outcome, ts")
        .gte("ts", since.toISOString())
        .limit(10000),
    ]);

    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setUTCMonth(d.getUTCMonth() - i, 1);
      months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    const current = months[months.length - 1]!;

    const tally = new Map<string, { calls: number; failed: number }>();
    const billable = new Set(["ok", "success"]);
    for (const c of calls ?? []) {
      const m = c.ts.slice(0, 7);
      const key = `${c.integration_id}|${m}`;
      const bucket = tally.get(key) ?? { calls: 0, failed: 0 };
      bucket.calls += 1;
      if (!billable.has(c.outcome)) bucket.failed += 1;
      tally.set(key, bucket);
    }

    const rows: CostRow[] = (integrations ?? []).map((i) => {
      const price = i.unit_price === null ? null : Number(i.unit_price);
      const monthRows: CostMonth[] = months.map((m) => {
        const b = tally.get(`${i.id}|${m}`) ?? { calls: 0, failed: 0 };
        return {
          month: m,
          calls: b.calls,
          failed: b.failed,
          cost: price === null ? null : +(b.calls * price).toFixed(2),
        };
      });
      const totalCalls = monthRows.reduce((s, m) => s + m.calls, 0);
      const currentRow = monthRows.find((m) => m.month === current)!;
      return {
        id: i.id,
        name: i.name,
        category: i.category,
        unitPrice: price,
        unitLabel: i.unit_label,
        currentCalls: currentRow.calls,
        currentCost: currentRow.cost,
        totalCalls,
        totalCost: price === null ? null : +(totalCalls * price).toFixed(2),
        months: monthRows,
      };
    });

    return { rows, months };
  });
