import {
  astuteLocked,
  ficaComplete,
  hasSig,
  isComplete,
  latestRoa,
  roaSigned,
  sigCurrent,
  submissionGates,
} from "./gates";
import { providerName, type CaseRecord } from "./types";

export interface NextAction {
  text: string;
  owner: "client" | "advisor" | "insurer" | "fsp" | "none";
}

/** The single next thing that moves this case forward, and who has to do it. */
export function nextAction(c: CaseRecord): NextAction {
  if (c.identity.sanctions === "hit")
    return { text: "Key Individual to review the sanctions/PEP match", owner: "fsp" };
  if (!c.identity.livenessVerified)
    return { text: "Client to complete identity verification", owner: "client" };
  if (!hasSig(c, "disclosure") || !hasSig(c, "loa"))
    return { text: "Client to sign the disclosure and Letter of Authority", owner: "client" };
  if (c.fnaMode === "unset")
    return { text: "Client to choose a full analysis or a single need", owner: "client" };
  if (c.fnaMode === "single-need" && !hasSig(c, "single-need"))
    return { text: "Client to sign the single-need disclaimer", owner: "client" };
  if (c.fnaMode === "full") {
    if (!c.astute.fetchedAt)
      return { text: "Pull the existing portfolio from Astute", owner: "advisor" };
    if (astuteLocked(c))
      return { text: "Client to sign the updated authority mandate", owner: "client" };
    if (!c.fna.result) return { text: "Complete the needs analysis", owner: "advisor" };
  }
  if (c.applications.length === 0) {
    if (c.quotes.items.length === 0) return { text: "Request insurer quotes", owner: "advisor" };
    if (c.quotes.selectedIds.length === 0)
      return { text: "Compare quotes and select options", owner: "advisor" };
    const v = latestRoa(c);
    if (!v || v.content.commentary.length < 20)
      return { text: "Add advisor commentary to the ROA", owner: "advisor" };
    if (!roaSigned(c)) return { text: `Client to sign ROA v${v.version}`, owner: "client" };
    if (!ficaComplete(c)) {
      const uploaded = !!(c.fica.idDocument && c.fica.proofOfResidence && c.fica.bankStatement);
      return uploaded
        ? { text: "Validate the client's bank details", owner: "advisor" }
        : { text: "Client to upload FICA documents", owner: "client" };
    }
    if (!sigCurrent(c, "debit-order"))
      return { text: "Client to sign the debit order mandate", owner: "client" };
    if (submissionGates(c).some((g) => g.id === "declaration" && !g.met))
      return { text: "Client to sign the life declaration", owner: "client" };
    return { text: "Submit the application to insurers", owner: "advisor" };
  }
  if (isComplete(c)) {
    if (c.review.renewalIssuedAt && !c.review.acknowledgedAt)
      return { text: "Client to acknowledge the renewal schedule", owner: "client" };
    return { text: c.annualReviewDue ? "Annual review scheduled" : "Complete", owner: "none" };
  }
  const pending = c.applications.filter((a) => a.status === "submitted");
  if (
    pending.some((a) => a.needsMedical) &&
    !c.execution.medicalCompletedAt &&
    c.execution.underwritingMode !== "tele"
  ) {
    return { text: "Client to complete the health disclosure", owner: "client" };
  }
  return {
    text: `Awaiting ${pending.map((p) => providerName(p.providerId)).join(", ")}`,
    owner: "insurer",
  };
}
