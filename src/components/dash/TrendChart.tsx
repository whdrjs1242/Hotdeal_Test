"use client";
import { useId, useMemo, useRef, useState } from "react";

export interface Series {
  key: string;
  label: string;
  color: string; // CSS var
  values: number[];
}

const W = 640;
const H = 220;
const PAD = { l: 44, r: 56, t: 12, b: 26 };

function niceMax(v: number) {
  if (v <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

const fmt = (n: number) => n.toLocaleString("ko-KR");
const short = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/**
 * 시계열 라인 차트. 한 개의 y축만 사용(단위가 다른 지표는 차트를 나눈다).
 * 2px 라인 + 단일 시리즈면 10% 면적, 끝점 라벨, 포인터를 따라가는 크로스헤어 + 전 시리즈 툴팁.
 */
export function TrendChart({ days, series, unit = "" }: { days: string[]; series: Series[]; unit?: string }) {
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => niceMax(Math.max(1, ...series.flatMap((s) => s.values))), [series]);
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (days.length <= 1 ? iw / 2 : (i / (days.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.ceil(days.length / 6);

  function onMove(e: React.PointerEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD.l) / iw) * (days.length - 1));
    setHover(Math.max(0, Math.min(days.length - 1, i)));
  }

  const single = series.length === 1;
  return (
    <div className="relative">
      {!single && (
        <div className="mb-2 flex flex-wrap gap-4 text-xs text-[var(--d-ink-2)]">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label={`${series.map((s) => s.label).join(", ")} 일별 추이`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--d-base)" : "var(--d-grid)"} strokeWidth={1} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--d-muted)" className="tnum">
              {t >= 10000 ? `${(t / 10000).toFixed(t % 10000 ? 1 : 0)}만` : fmt(t)}
            </text>
          </g>
        ))}
        {days.map((d, i) =>
          i % labelEvery === 0 || i === days.length - 1 ? (
            <text key={d} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--d-muted)" className="tnum">
              {short(d)}
            </text>
          ) : null,
        )}
        {single && (
          <>
            <defs>
              <linearGradient id={`${id}-a`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={series[0].color} stopOpacity={0.14} />
                <stop offset="1" stopColor={series[0].color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <path
              d={`M${x(0)},${y(0)} ${series[0].values.map((v, i) => `L${x(i)},${y(v)}`).join(" ")} L${x(days.length - 1)},${y(0)} Z`}
              fill={`url(#${id}-a)`}
            />
          </>
        )}
        {series.map((s) => (
          <path
            key={s.key}
            d={s.values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {/* 끝점 + 직접 라벨 (값은 텍스트 토큰, 색은 마커가 담당) */}
        {series.map((s) => {
          const i = s.values.length - 1;
          return (
            <g key={s.key}>
              <circle cx={x(i)} cy={y(s.values[i])} r={4} fill={s.color} stroke="var(--d-surface)" strokeWidth={2} />
              <text x={x(i) + 8} y={y(s.values[i]) + 4} fontSize={11} fontWeight={600} fill="var(--d-ink)" className="tnum">
                {fmt(s.values[i])}
              </text>
            </g>
          );
        })}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--d-muted)" strokeWidth={1} />
            {series.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(s.values[hover])} r={4} fill={s.color} stroke="var(--d-surface)" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {hover != null && (
        <div
          className="card pointer-events-none absolute top-6 z-10 min-w-32 px-3 py-2 text-xs"
          style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% - 64px), calc(100% - 140px))` }}
        >
          <div className="mb-1 text-[var(--d-muted)]">{days[hover]}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} />
              <b className="tnum">
                {fmt(s.values[hover])}
                {unit}
              </b>
              <span className="text-[var(--d-ink-2)]">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <details className="mt-2 text-xs text-[var(--d-ink-2)]">
        <summary className="cursor-pointer">표로 보기</summary>
        <div className="mt-2 max-h-48 overflow-auto">
          <table className="tnum w-full text-right">
            <thead>
              <tr className="text-[var(--d-muted)]">
                <th className="text-left font-normal">날짜</th>
                {series.map((s) => (
                  <th key={s.key} className="font-normal">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d}>
                  <td className="text-left">{d}</td>
                  {series.map((s) => (
                    <td key={s.key}>{fmt(s.values[i])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
