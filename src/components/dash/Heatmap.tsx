"use client";
import { useState } from "react";

const DOW = ["월", "화", "수", "목", "금", "토", "일"];

/** 요일 × 시간 클릭 히트맵 (순차 블루 램프). 셀마다 호버 툴팁 */
export function Heatmap({ cells }: { cells: { dow: number; hour: number; clicks: number }[] }) {
  const [hover, setHover] = useState<{ dow: number; hour: number; v: number } | null>(null);
  const grid = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c.clicks]));
  const max = Math.max(1, ...cells.map((c) => c.clicks));
  const step = (v: number) => {
    if (!v) return "var(--d-seq-0)";
    const t = v / max;
    return t > 0.75 ? "var(--d-seq-4)" : t > 0.5 ? "var(--d-seq-3)" : t > 0.25 ? "var(--d-seq-2)" : "var(--d-seq-1)";
  };
  const peak = cells.reduce((a, c) => (c.clicks > (a?.clicks ?? -1) ? c : a), cells[0]);
  return (
    <div className="relative">
      <div className="grid grid-cols-[20px_repeat(24,minmax(0,1fr))] gap-[2px] text-[10px] text-[var(--d-muted)]">
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="tnum text-center">
            {h % 6 === 0 ? h : ""}
          </span>
        ))}
        {DOW.map((d, di) => (
          <div key={d} className="contents">
            <span className="flex items-center">{d}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const v = grid.get(`${di + 1}-${h}`) ?? 0;
              return (
                <span
                  key={h}
                  tabIndex={0}
                  onPointerEnter={() => setHover({ dow: di, hour: h, v })}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover({ dow: di, hour: h, v })}
                  className="aspect-square rounded-[3px] outline-none"
                  style={{ background: step(v), boxShadow: hover?.dow === di && hover?.hour === h ? "0 0 0 2px var(--d-ink)" : undefined }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--d-ink-2)]">
        <span>
          {hover
            ? `${DOW[hover.dow]}요일 ${hover.hour}시 · ${hover.v.toLocaleString("ko-KR")}회`
            : peak
              ? `피크: ${DOW[peak.dow - 1]}요일 ${peak.hour}시 (${peak.clicks.toLocaleString("ko-KR")}회)`
              : ""}
        </span>
        <span className="flex items-center gap-1">
          적음
          {["--d-seq-0", "--d-seq-1", "--d-seq-2", "--d-seq-3", "--d-seq-4"].map((v) => (
            <span key={v} className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: `var(${v})` }} />
          ))}
          많음
        </span>
      </div>
    </div>
  );
}
