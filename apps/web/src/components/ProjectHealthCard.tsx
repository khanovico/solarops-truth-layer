type ProjectHealthCardProps = {
  label: string;
  value: string | number;
  subtext?: string;
  tone: "neutral" | "green" | "yellow" | "red";
};

export function ProjectHealthCard({
  label,
  value,
  subtext,
  tone,
}: ProjectHealthCardProps) {
  return (
    <section className={`metric-card metric-${tone}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {subtext ? <span className="metric-subtext">{subtext}</span> : null}
    </section>
  );
}
