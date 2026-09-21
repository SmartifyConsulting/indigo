import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  Advisor,
  AppState,
  CaseRecord,
  CrmConnection,
  CrmLogEntry,
  LedgerEvent,
  QueueItem,
  Role,
} from "@/lib/domain/types";

/**
 * The workspace (firm settings, advisors, cases, audit ledger, CRM state and the delivery
 * queue) lives in the database. The browser keeps a working copy so the workflow engine stays
 * synchronous; every action is written back through `saveWorkspace`.
 */

export interface WorkspaceSnapshot {
  empty: boolean;
  fsp: AppState["fsp"];
  advisors: Advisor[];
  cases: CaseRecord[];
  ledger: LedgerEvent[];
  crm: CrmConnection[];
  crmLog: CrmLogEntry[];
  queue: QueueItem[];
}

export const loadWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WorkspaceSnapshot> => {
    const sb = context.supabase;
    const [fspRes, advisorRes, caseRes, ledgerRes, crmRes, crmLogRes, queueRes] = await Promise.all([
      sb.from("fsp_settings").select("*").eq("id", true).maybeSingle(),
      sb.from("advisors").select("*").order("onboarded_at"),
      sb.from("cases").select("*").order("created_at"),
      sb.from("ledger_events").select("*").order("seq"),
      sb.from("crm_connections").select("*").order("id"),
      sb.from("crm_log").select("*").order("ts", { ascending: false }).limit(200),
      sb.from("integration_queue").select("*").order("ts", { ascending: false }).limit(200),
    ]);

    const cases = (caseRes.data ?? []).map((row) => row.data as unknown as CaseRecord);

    return {
      empty: cases.length === 0,
      fsp: {
        name: fspRes.data?.name ?? "",
        fspNumber: fspRes.data?.fsp_number ?? "",
        keyIndividual: fspRes.data?.key_individual ?? "",
      },
      advisors: (advisorRes.data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        title: a.title,
        fsNumber: a.fs_number,
        active: a.active,
        onboardedAt: a.onboarded_at,
      })),
      cases,
      ledger: (ledgerRes.data ?? []).map((e) => ({
        seq: e.seq,
        ts: e.ts,
        caseId: e.case_id,
        actor: { role: e.actor_role as Role | "system", name: e.actor_name },
        type: e.type as LedgerEvent["type"],
        summary: e.summary,
        prevHash: e.prev_hash,
        hash: e.hash,
      })),
      crm: (crmRes.data ?? []).map((c) => ({
        id: c.id as CrmConnection["id"],
        name: c.name,
        detail: c.detail,
        connected: c.connected,
        lastSyncAt: c.last_sync_at ?? undefined,
      })),
      crmLog: (crmLogRes.data ?? []).map((l) => ({
        id: l.id,
        ts: l.ts,
        crm: l.crm as CrmLogEntry["crm"],
        caseId: l.case_id,
        clientName: l.client_name,
        object: l.object,
        action: l.action,
      })),
      queue: (queueRes.data ?? []).map((q) => ({
        id: q.id,
        ts: q.ts,
        target: q.target as QueueItem["target"],
        caseId: q.case_id,
        clientName: q.client_name,
        action: q.action,
        status: q.status as QueueItem["status"],
        attempts: q.attempts,
        lastError: q.last_error ?? undefined,
      })),
    };
  });

interface SaveInput {
  state: AppState;
  /** Wipe existing rows first (used by "reset demo data"). */
  replace?: boolean;
}

export const saveWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SaveInput) => input)
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const s = data.state;

    if (data.replace) {
      await Promise.all([
        sb.from("cases").delete().neq("id", ""),
        sb.from("ledger_events").delete().gte("seq", 0),
        sb.from("crm_log").delete().neq("id", ""),
        sb.from("integration_queue").delete().neq("id", ""),
      ]);
    }

    await sb.from("fsp_settings").upsert({
      id: true,
      name: s.fsp.name,
      fsp_number: s.fsp.fspNumber,
      key_individual: s.fsp.keyIndividual,
      updated_at: new Date().toISOString(),
    });

    if (s.advisors.length) {
      await sb.from("advisors").upsert(
        s.advisors.map((a) => ({
          id: a.id,
          name: a.name,
          title: a.title,
          fs_number: a.fsNumber,
          active: a.active,
          onboarded_at: a.onboardedAt,
        })),
      );
    }

    if (s.cases.length) {
      await sb.from("cases").upsert(
        s.cases.map((c) => ({
          id: c.id,
          code: c.code,
          advisor_id: c.advisorId,
          client_name: c.clientName,
          email: c.email,
          phone: c.phone,
          data: JSON.parse(JSON.stringify(c)) as never,
          created_at: c.createdAt,
          updated_at: new Date().toISOString(),
        })),
      );
    }

    if (s.ledger.length) {
      await sb.from("ledger_events").upsert(
        s.ledger.map((e) => ({
          seq: e.seq,
          ts: e.ts,
          case_id: e.caseId,
          actor_role: e.actor.role,
          actor_name: e.actor.name,
          type: e.type,
          summary: e.summary,
          prev_hash: e.prevHash,
          hash: e.hash,
        })),
        { onConflict: "seq", ignoreDuplicates: true },
      );
    }

    if (s.crm.length) {
      await sb.from("crm_connections").upsert(
        s.crm.map((c) => ({
          id: c.id,
          name: c.name,
          detail: c.detail,
          connected: c.connected,
          last_sync_at: c.lastSyncAt ?? null,
        })),
      );
    }

    if (s.crmLog.length) {
      await sb.from("crm_log").upsert(
        s.crmLog.map((l) => ({
          id: l.id,
          ts: l.ts,
          crm: l.crm,
          case_id: l.caseId,
          client_name: l.clientName,
          object: l.object,
          action: l.action,
        })),
        { onConflict: "id", ignoreDuplicates: true },
      );
    }

    if (s.queue.length) {
      await sb.from("integration_queue").upsert(
        s.queue.map((q) => ({
          id: q.id,
          ts: q.ts,
          target: q.target,
          case_id: q.caseId,
          client_name: q.clientName,
          action: q.action,
          status: q.status,
          attempts: q.attempts,
          last_error: q.lastError ?? null,
        })),
      );
    }

    return { ok: true as const, savedAt: new Date().toISOString() };
  });
