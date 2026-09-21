/**
 * DIDIT identity verification: request/response helpers shared by the server functions and the
 * tests. DIDIT's verification API lives at verification.didit.me and takes an `x-api-key` header.
 * Standalone endpoints used here: POST /v3/id-verification/ (front_image) and
 * POST /v3/passive-liveness/ (user_image).
 */

export const DIDIT_BASE = "https://verification.didit.me";

export const ID_CHECK_PATH = "/v3/id-verification/";
export const LIVENESS_PATH = "/v3/passive-liveness/";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Base64 length limit that keeps an upload under DIDIT's 10 MB image cap. */
export const MAX_BASE64_LENGTH = 13_000_000;

/** A South African ID number: 13 digits, YYMMDD, a plausible day and month, Luhn check digit. */
export function isValidSaId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  const month = Number(id.slice(2, 4));
  const day = Number(id.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let digit = Number(id[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

const digitsOnly = (s: string) => s.replace(/\D/g, "");

/** True when a number read from a document is the same as the one on file (ignoring spaces and dashes). */
export const sameIdNumber = (a: string, b: string) => digitsOnly(a) === digitsOnly(b);

export const maskId = (id: string) => (id.length >= 4 ? `•••• ${id.slice(-4)}` : "••••");

export interface IdCheckSummary {
  status: "approved" | "declined";
  documentNumber: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
  issuingState: string | null;
  problems: string[];
  requestId: string | null;
}

export interface LivenessSummary {
  status: "approved" | "declined";
  score: number | null;
  problems: string[];
  requestId: string | null;
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const joined = (parts: (string | null)[]) => parts.filter(Boolean).join(" ");
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Problems worth showing: error and warning items, in plain words. Informational items are dropped. */
function problemsFrom(warnings: unknown): string[] {
  if (!Array.isArray(warnings)) return [];
  const out: string[] = [];
  for (const w of warnings) {
    const item = obj(w);
    const level = str(item["log_type"]);
    if (level === "information") continue;
    const text = str(item["short_description"]) ?? str(item["risk"]);
    if (text) out.push(text);
  }
  return out;
}

/** Reduce DIDIT's ID verification response to what the app needs. The images are never kept. */
export function summariseIdResponse(json: unknown): IdCheckSummary {
  const root = obj(json);
  const v = obj(root["id_verification"]);
  return {
    status: str(v["status"])?.toLowerCase() === "approved" ? "approved" : "declined",
    documentNumber: str(v["personal_number"]) ?? str(v["document_number"]),
    fullName: str(v["full_name"]) ?? (joined([str(v["first_name"]), str(v["last_name"])]) || null),
    dateOfBirth: str(v["date_of_birth"]),
    issuingState: str(v["issuing_state"]),
    problems: problemsFrom(v["warnings"]),
    requestId: str(root["request_id"]),
  };
}

/** Reduce DIDIT's passive liveness response to what the app needs. */
export function summariseLivenessResponse(json: unknown): LivenessSummary {
  const root = obj(json);
  const v = obj(root["liveness"]);
  return {
    status: str(v["status"])?.toLowerCase() === "approved" ? "approved" : "declined",
    score: num(v["score"]),
    problems: problemsFrom(v["warnings"]),
    requestId: str(root["request_id"]),
  };
}
