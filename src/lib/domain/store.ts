import { useEffect, useSyncExternalStore } from "react";

import * as engine from "./engine";
import type { Result } from "./engine";
import { buildSeedState } from "./seed";
import type { AppState, FnaInputs, NeedId, ProviderId, Role, SignatureKind } from "./types";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace.functions";

/**
 * Working copy of the workspace. The record of truth is the database: the copy is loaded once
 * after sign-in, the workflow engine runs against it synchronously, and every change is written
 * back. Server rendering always uses the deterministic seed so hydration stays clean.
 */

const VIEW_KEY = "indigro-view-v1";
/** Immutable seed handed to React for server rendering and hydration; live state is never assigned here. */
const SERVER_SNAPSHOT: AppState = buildSeedState();
let state: AppState = SERVER_SNAPSHOT;
let hydrated = false;
let ready = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** The role / client / insurer being viewed is a per-browser preference, not firm data. */
function persistView() {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(state.session));
  } catch {
    /* storage unavailable: the app still works for the session */
  }
}

function pushToDatabase(replace = false) {
  if (!ready) return;
  const snapshot = structuredClone(state);
  void saveWorkspace({ data: { state: snapshot, replace } }).catch((e: unknown) => {
    console.error("Workspace save failed", e);
  });
}

function scheduleSave() {
  if (!ready) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => pushToDatabase(), 400);
}

/** Run an engine function against a clone and commit, even on a blocked result, so blocked attempts reach the ledger. */
function act<T>(fn: (draft: AppState, now: string) => T): T {
  const draft = structuredClone(state);
  const out = fn(draft, new Date().toISOString());
  state = draft;
  persistView();
  scheduleSave();
  emit();
  return out;
}

export function getState() {
  return state;
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_SNAPSHOT,
  );
}

/** Mount once at the root, after a session exists. Loads the workspace, seeding it on first run. */
export function useStoreHydration(enabled: boolean) {
  useEffect(() => {
    if (!enabled || hydrated) return;
    hydrated = true;

    let session = state.session;
    try {
      const raw = localStorage.getItem(VIEW_KEY);
      if (raw) session = { ...session, ...(JSON.parse(raw) as AppState["session"]) };
    } catch {
      /* ignore corrupt preferences */
    }

    void loadWorkspace()
      .then((snapshot) => {
        if (snapshot.empty) {
          // First run for this firm: write the starting workspace into the database.
          state = { ...buildSeedState(), session };
          ready = true;
          pushToDatabase(true);
        } else {
          state = {
            session,
            fsp: snapshot.fsp,
            advisors: snapshot.advisors,
            cases: snapshot.cases,
            ledger: snapshot.ledger,
            crm: snapshot.crm,
            crmLog: snapshot.crmLog,
            queue: snapshot.queue,
          };
          ready = true;
        }
        if (!state.session.clientCaseId && state.cases[0]) {
          state.session.clientCaseId = state.cases[0].id;
        }
        emit();
      })
      .catch((e: unknown) => {
        console.error("Workspace load failed", e);
        hydrated = false;
      });
  }, [enabled]);
}

/** Restore the starting workspace, replacing what is stored in the database. */
export function resetDemo() {
  const session = state.session;
  state = buildSeedState();
  state.session = session;
  persistView();
  pushToDatabase(true);
  emit();
}

const session = (fn: (s: AppState["session"]) => void) =>
  act((d) => {
    fn(d.session);
  });

export const actions = {
  setRole: (role: Role) => session((s) => void (s.role = role)),
  setClientCase: (id: string) => session((s) => void (s.clientCaseId = id)),
  setInsurer: (id: ProviderId) => session((s) => void (s.insurerId = id)),

  createCase: (input: { name: string; email: string; phone: string; advisorId: string }) =>
    act((d, now) => engine.createCase(d, now, input)),
  updateProfile: (id: string, patch: Parameters<typeof engine.updateProfile>[2]) =>
    act((d) => engine.updateProfile(d, id, patch)),
  verifyIdentity: (id: string) => act((d, now) => engine.verifyIdentity(d, now, id)),
  recordIdentityCheck: (id: string, input: Parameters<typeof engine.recordIdentityCheck>[3]) =>
    act((d, now) => engine.recordIdentityCheck(d, now, id, input)),
  recordIdentityFailure: (id: string, reason: string) =>
    act((d, now) => engine.recordIdentityFailure(d, now, id, reason)),
  sign: (id: string, kind: SignatureKind, name: string) =>
    act((d, now) => engine.signDocument(d, now, id, kind, name)),
  chooseRoute: (
    id: string,
    mode: "full" | "single-need",
    single?: { needId: NeedId; amount: number },
  ) => act((d, now) => engine.chooseRoute(d, now, id, mode, single)),
  runAstute: (id: string) => act((d, now) => engine.runAstutePull(d, now, id)),
  saveFna: (id: string, inputs: FnaInputs) => act((d, now) => engine.saveFna(d, now, id, inputs)),
  requestQuotes: (id: string) => act((d, now) => engine.requestQuotes(d, now, id)),
  toggleQuote: (id: string, quoteId: string) =>
    act((d, now) => engine.toggleQuote(d, now, id, quoteId)),
  setCommentary: (id: string, text: string) =>
    act((d, now) => engine.setCommentary(d, now, id, text)),
  commitCommentary: (id: string) => act((d, now) => engine.commitCommentary(d, now, id)),
  recordMeeting: (id: string, title: string, notes: string) =>
    act((d, now) => engine.recordMeeting(d, now, id, title, notes)),
  uploadFica: (
    id: string,
    doc: "idDocument" | "proofOfResidence" | "bankStatement",
    file: string,
  ) => act((d, now) => engine.uploadFica(d, now, id, doc, file)),
  validateBank: (id: string) => act((d, now) => engine.validateBank(d, now, id)),
  sendUnderwritingLink: (id: string, mode: "self-service" | "tele") =>
    act((d, now) => engine.sendUnderwritingLink(d, now, id, mode)),
  completeMedical: (id: string) => act((d, now) => engine.completeMedical(d, now, id)),
  submitApplication: (id: string) => act((d, now) => engine.submitApplication(d, now, id)),
  decide: (id: string, quoteId: string, decision: "issue" | "decline") =>
    act((d, now) => engine.insurerDecision(d, now, id, quoteId, decision)),
  issueRenewal: (id: string) => act((d, now) => engine.issueRenewal(d, now, id)),
  acknowledgeReview: (id: string) => act((d, now) => engine.acknowledgeReview(d, now, id)),
  setCrm: (id: "salesforce" | "hubspot", on: boolean) =>
    act((d) => engine.setCrmConnected(d, id, on)),
  retryQueue: (itemId: string) => act((d, now) => engine.retryQueueItem(d, now, itemId)),
};

export type { Result };
