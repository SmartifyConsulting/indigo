import { sha256 } from "./sha256";
import type { LedgerEvent } from "./types";

/**
 * Append-only, hash-chained audit ledger. Each entry commits to the previous entry's hash,
 * so editing or removing any historical entry breaks every hash after it. In production
 * this chain is anchored to write-once-read-many (WORM) object storage; here it lives in
 * the app state so the verification logic is real and demonstrable.
 */

export const GENESIS_HASH = "0".repeat(64);

export const hashEvent = (e: Omit<LedgerEvent, "hash">) =>
  sha256(
    [e.prevHash, e.seq, e.ts, e.caseId ?? "-", e.actor.role, e.actor.name, e.type, e.summary].join(
      "|",
    ),
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
