/** 지표 타일: 라벨 · 값 · 직전 기간 대비 · 스파크라인(현재 기간) */
export function StatTile({
  label,
  value,
  delta,
  trend,
  upIsGood = true,
}: {
  label: string;
  value: string;
  delta: number | null;
  trend: number[];
  upIsGood?: boolean;
}) {
  const good = delta == null ? null : delta === 0 ? null : (delta > 0) === upIsGood;
  const max = Math.max(1, ...trend);
  const pts = trend.map((v, i) => `${(i / Math.max(1, trend.length - 1)) * 100},${28 - (v / max) * 26}`).join(" ");
  return (
    <div className="card p-4">
      <div className="text-xs text-[var(--d-ink-2)]">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 h-4 truncate whitespace-nowrap text-xs">
        {delta != null && (
          <span className="tnum font-semibold" style={{ color: good == null ? "var(--d-muted)" : good ? "var(--d-good)" : "var(--d-bad)" }}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "–"} {Math.abs(delta)}%
          </span>
        )}
        <span className="ml-1 text-[var(--d-muted)]">vs 직전</span>
      </div>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-8 w-full" aria-hidden>
        <polyline points={pts} fill="none" stroke="var(--d-muted)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {trend.length > 0 && (
          <circle cx={100} cy={28 - (trend[trend.length - 1] / max) * 26} r={2.5} fill="var(--d-s1)" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
    </div>
  );
}
