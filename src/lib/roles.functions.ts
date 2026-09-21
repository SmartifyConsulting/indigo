import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Pending access requests for the sensitive roles (administrator, compliance, FSP). */
export interface RoleRequestRow {
  id: string;
  userId: string;
  role: string;
  status: string;
  createdAt: string;
  fullName: string;
  email: string;
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as {
    rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const { data } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Only an administrator can do that.");
}

export const listRoleRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ requests: RoleRequestRow[] }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("role_requests")
      .select("id, user_id, requested_role, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = data ?? [];
    const ids = [...new Set(rows.map((r) => r.user_id as string))];
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids)
      : { data: [] as { id: string; full_name: string; email: string }[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      requests: rows.map((r) => ({
        id: r.id as string,
        userId: r.user_id as string,
        role: r.requested_role as string,
        status: r.status as string,
        createdAt: r.created_at as string,
        fullName: byId.get(r.user_id as string)?.full_name ?? "",
        email: byId.get(r.user_id as string)?.email ?? "",
      })),
    };
  });

export const decideRoleRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string; approve: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req } = await supabaseAdmin
      .from("role_requests")
      .select("id, user_id, requested_role, status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!req) throw new Error("That request no longer exists.");
    if (data.approve) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: req.user_id, role: req.requested_role }, { onConflict: "user_id,role" });
    }
    await supabaseAdmin
      .from("role_requests")
      .update({
        status: data.approve ? "approved" : "declined",
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", data.requestId);
    return { ok: true };
  });
