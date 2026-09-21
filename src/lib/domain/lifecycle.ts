import { STAGES, getStage, isComplete, type StageNo } from "./gates";
import type { AppState, CaseRecord } from "./types";

export interface LifecycleView {
  chips: Partial<Record<StageNo, string>>;
  active: StageNo | undefined;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Live labels for the lifecycle diagram, tailored to who is looking. */
export function lifecycleView(s: AppState): LifecycleView {
  const { role, clientCaseId, insurerId } = s.session;

  if (role === "client") {
    const c = s.cases.find((x) => x.id === clientCaseId);
    return { chips: {}, active: c ? getStage(c) : undefined };
  }

  if (role === "insurer") {
    const pending = s.cases.reduce(
      (n, c) =>
        n +
        c.applications.filter((a) => a.providerId === insurerId && a.status === "submitted").length,
      0,
    );
    return { chips: pending ? { 6: `${pending} awaiting you` } : {}, active: undefined };
  }

  const mine: CaseRecord[] =
    role === "advisor" ? s.cases.filter((c) => c.advisorId === s.advisors[0]?.id) : s.cases;
  const chips: Partial<Record<StageNo, string>> = {};
  for (const st of STAGES) {
    const n = mine.filter((c) => getStage(c) === st.no && (st.no === 6 || !isComplete(c))).length;
    if (n > 0) chips[st.no] = plural(n, "client here", "clients here");
  }
  return { chips, active: undefined };
}
