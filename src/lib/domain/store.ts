import { useEffect, useSyncExternalStore } from "react";

import * as engine from "./engine";
import type { Result } from "./engine";
import { buildSeedState } from "./seed";
import type { AppState, FnaInputs, NeedId, ProviderId, Role, SignatureKind } from "./types";

/**
 * Client-side store. State starts as the deterministic seed on both server and client (so
 * server-rendered HTML always hydrates cleanly), then swaps in the saved copy from
 * localStorage after mount. In production this is the API/database layer.
 */

const KEY = "indigro-state-v1";
let state: AppState = buildSeedState();
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: the app still works for the session */
  }
}

/** Run an engine function against a clone and commit, even on a blocked result, so blocked attempts reach the ledger. */
function act<T>(fn: (draft: AppState, now: string) => T): T {
  const draft = structuredClone(state);
  const out = fn(draft, new Date().toISOString());
  state = draft;
  persist();
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
    () => state,
  );
}

/** Mount once at the root. */
export function useStoreHydration() {
  useEffect(() => {
    if (hydrated) return;
    hydrated = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw) as AppState;
        emit();
      }
    } catch {
      /* ignore corrupt storage and keep the seed */
    }
  }, []);
}

export function resetDemo() {
  const role = state.session.role;
  state = buildSeedState();
  state.session.role = role;
  persist();
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
