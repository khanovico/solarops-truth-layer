import type { ClaimStatus } from "../lib/types";

const claimTone: Record<ClaimStatus, string> = {
  verified: "green",
  assumption: "yellow",
  missing_evidence: "neutral",
  contradicted: "red",
};

const claimLabel: Record<ClaimStatus, string> = {
  verified: "Verified",
  assumption: "Assumption",
  missing_evidence: "Missing Evidence",
  contradicted: "Contradicted",
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return <span className={`badge badge-${claimTone[status]}`}>{claimLabel[status]}</span>;
}
