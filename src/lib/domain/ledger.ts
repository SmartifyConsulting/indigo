import { sha256 } from "./sha256";
import type { LedgerEvent, LedgerType } from "./types";

export const LEDGER_TONE: Partial<Record<LedgerType, "danger" | "success" | "warning" | "info">> = {
  GATE_BLOCKED: "danger",
  POLICY_ISSUED: "success",
  APPLICATION_DECLINED: "danger",
  ASTUTE_ALERT: "warning",
  DOCUMENT_SIGNED: "info",
};

/**
 * Append-only, hash-chained audit ledger. Each entry commits to the previous entry's hash,
 * so editing or removing any historical entry breaks every hash after it. In production
 * this chain is anchored to write-once-read-many (WORM) object storage; here it lives in
 * the app state so the verification logic is real and demonstrable.
 */

export const GENESIS_HASH = "0".repeat(64);

/**
 * The moment an entry happened, as one canonical ISO string. A database can return the same
 * instant as "…07:30:00+00:00" that was written as "…07:30:00.000Z"; hashing the raw text would
 * make an intact ledger look tampered after a save and reload, so the hash uses this form.
 */
const canonicalTime = (ts: string) => {
  const t = new Date(ts);
  return Number.isNaN(t.getTime()) ? ts : t.toISOString();
};

export const hashEvent = (e: Omit<LedgerEvent, "hash">) =>
  sha256(
    [
      e.prevHash,
      e.seq,
      canonicalTime(e.ts),
      e.caseId ?? "-",
      e.actor.role,
      e.actor.name,
      e.type,
      e.summary,
    ].join("|"),
  );

export function appendEvent(
  ledger: LedgerEvent[],
  partial: Omit<LedgerEvent, "seq" | "prevHash" | "hash">,
): LedgerEvent {
  const prev = ledger[ledger.length - 1];
  const base = { ...partial, seq: (prev?.seq ?? 0) + 1, prevHash: prev?.hash ?? GENESIS_HASH };
  const event = { ...base, hash: hashEvent(base) };
  ledger.push(event);
  return event;
}

export type Verification =
  | { ok: true; checked: number }
  | { ok: false; checked: number; brokenAtSeq: number; reason: string };

export function verifyLedger(ledger: LedgerEvent[]): Verification {
  let prevHash = GENESIS_HASH;
  for (let i = 0; i < ledger.length; i++) {
    const e = ledger[i]!;
    if (e.prevHash !== prevHash) {
      return {
        ok: false,
        checked: i,
        brokenAtSeq: e.seq,
        reason: "Chain link does not match the previous entry",
      };
    }
    const { hash, ...rest } = e;
    if (hashEvent(rest) !== hash) {
      return {
        ok: false,
        checked: i,
        brokenAtSeq: e.seq,
        reason: "Entry contents do not match their recorded hash",
      };
    }
    prevHash = hash;
  }
  return { ok: true, checked: ledger.length };
}
