import type { ProjectStage } from "../lib/types";

const stageLabel: Record<ProjectStage, string> = {
  intake: "Intake",
  site_survey: "Site Survey",
  design: "Design",
  incentive_review: "Incentive Review",
  rebate_submitted: "Rebate Submitted",
  financing_review: "Financing Review",
  permitting: "Permitting",
  procurement: "Procurement",
  installation: "Installation",
  commissioning: "Commissioning",
  monitoring: "Monitoring",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

export function ProjectStageBadge({ stage }: { stage: ProjectStage }) {
  return <span className="badge badge-stage">{stageLabel[stage]}</span>;
}
