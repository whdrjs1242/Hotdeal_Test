"use client";
import { useState } from "react";

export interface BarItem {
  label: string;
  value: number;
  sub?: string;
}

/**
 * 가로 막대 목록 (크기 비교). 막대 ≤ 24px, 끝 4px 라운드, 값은 막대 끝 밖에 텍스트 토큰으로.
 * 행 전체가 호버 타깃.
 */
export function BarList({ items, color = "var(--d-s1)", unit = "" }: { items: BarItem[]; color?: string; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  if (!items.length) return <p className="py-6 text-center text-xs text-[var(--d-muted)]">데이터가 없어요</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li
          key={it.label}
          tabIndex={0}
          onPointerEnter={() => setHover(i)}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
          className="relative grid grid-cols-[88px_1fr] items-center gap-3 rounded-lg outline-none"
        >
          <span className="truncate text-xs text-[var(--d-ink-2)]">{it.label}</span>
          <div className="flex items-center gap-2">
            <div
              className="h-4 rounded-r-[4px] transition-opacity"
              style={{ width: `${Math.max(2, (it.value / max) * 82)}%`, background: color, opacity: hover == null || hover === i ? 1 : 0.45 }}
            />
            <span className="tnum shrink-0 text-xs font-semibold">
              {it.value.toLocaleString("ko-KR")}
              {unit}
            </span>
          </div>
          {hover === i && (
            <div className="card pointer-events-none absolute -top-9 left-24 z-10 whitespace-nowrap px-2.5 py-1 text-xs">
              <b className="tnum">
                {it.value.toLocaleString("ko-KR")}
                {unit}
              </b>{" "}
              <span className="text-[var(--d-ink-2)]">
                {it.label} · {Math.round((it.value / total) * 100)}%{it.sub ? ` · ${it.sub}` : ""}
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
