import {
  STAGES,
  astuteLocked,
  ficaComplete,
  getStage,
  hasSig,
  isComplete,
  latestRoa,
  roaSigned,
  sigCurrent,
  type StageNo,
} from "./gates";
import type { AppState, CaseRecord } from "./types";

export interface LifecycleView {
  chips: Partial<Record<StageNo, string>>;
  active: StageNo | undefined;
  /** For the client's current step: how many of its lines are already done, so the next one can be marked. */
  activeRowsDone: number | undefined;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const leadingDone = (steps: boolean[]) => {
  const firstUndone = steps.findIndex((done) => !done);
  return firstUndone === -1 ? steps.length : firstUndone;
};

/**
 * How many of a step's lines are already done, counted in order, so the line after them is the
 * one the client is on. The lines match the flow map, top to bottom. A client looking at their
 * own case has arrived, so step 1's first line (QR or secure link) is always done and the next
 * line, Liveness and Home Affairs ID, is the one to do.
 */
export function stageRowsDone(c: CaseRecord, stage: StageNo): number {
  switch (stage) {
    case 1:
      return leadingDone([
        true,
        c.identity.livenessVerified,
        c.identity.sanctions === "clear",
        hasSig(c, "disclosure") && hasSig(c, "loa"),
      ]);
    case 2: {
      const fetched = !!c.astute.fetchedAt;
      const open = fetched && !astuteLocked(c);
      return leadingDone([fetched, fetched, open, open]);
    }
    case 3: {
      const done = !!c.fna.result;
      return leadingDone([!!c.fna.inputs || done, done, done, done]);
    }
    case 4: {
      const roa = !!latestRoa(c);
      // The last line stays current until the client has signed the ROA.
      return leadingDone([
        !!c.quotes.requestedAt,
        c.quotes.selectedIds.length > 0 && roa,
        roa,
        roaSigned(c),
      ]);
    }
    case 5: {
      const selected = c.quotes.items.filter((q) => c.quotes.selectedIds.includes(q.id));
      const life = selected.some((q) =>
        ["life", "disability", "severe-illness"].includes(q.needId),
      );
      const medical = selected.some((q) => q.underwriting === "medical");
      return leadingDone([
        !!latestRoa(c),
        roaSigned(c),
        ficaComplete(c),
        sigCurrent(c, "debit-order") && (!life || sigCurrent(c, "life-declaration")),
        !medical || !!c.execution.medicalCompletedAt,
      ]);
    }
    case 6:
      return leadingDone([
        c.applications.length > 0 && c.applications.every((a) => a.status !== "submitted"),
        c.applications.some((a) => a.status === "issued"),
        !!c.annualReviewDue,
        !!c.review.acknowledgedAt,
      ]);
  }
}

/** Live labels for the lifecycle diagram, tailored to who is looking. */
export function lifecycleView(s: AppState): LifecycleView {
  const { role, clientCaseId, insurerId } = s.session;

  if (role === "client") {
    const c = s.cases.find((x) => x.id === clientCaseId);
    const active = c ? getStage(c) : undefined;
    return {
      chips: {},
      active,
      activeRowsDone: c && active ? stageRowsDone(c, active) : undefined,
    };
  }

  if (role === "insurer") {
    const pending = s.cases.reduce(
      (n, c) =>
        n +
        c.applications.filter((a) => a.providerId === insurerId && a.status === "submitted").length,
      0,
    );
    return {
      chips: pending ? { 6: `${pending} awaiting you` } : {},
      active: undefined,
      activeRowsDone: undefined,
    };
  }

  const mine: CaseRecord[] =
    role === "advisor" ? s.cases.filter((c) => c.advisorId === s.advisors[0]?.id) : s.cases;
  const chips: Partial<Record<StageNo, string>> = {};
  for (const st of STAGES) {
    const n = mine.filter((c) => getStage(c) === st.no && (st.no === 6 || !isComplete(c))).length;
    if (n > 0) chips[st.no] = plural(n, "client here", "clients here");
  }
  return { chips, active: undefined, activeRowsDone: undefined };
}
