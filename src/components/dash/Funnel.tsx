"use client";
import { useState } from "react";

/** 서열형 퍼널: 한 색상 램프(연→진)로 단계, 단계 사이 전환율 표기 */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, steps[0]?.value ?? 1);
  const ramp = ["var(--d-seq-1)", "var(--d-seq-2)", "var(--d-seq-3)", "var(--d-seq-4)"];
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => {
        const prev = steps[i - 1]?.value;
        const rate = prev ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={s.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            {rate != null && <div className="tnum pl-1 text-[11px] text-[var(--d-muted)]">↓ {rate}%</div>}
            <div className="flex items-center gap-3">
              <div
                className="h-6 rounded-r-[4px]"
                style={{ width: `${Math.max(3, (s.value / max) * 70)}%`, background: ramp[Math.min(i, ramp.length - 1)], opacity: hover == null || hover === i ? 1 : 0.5 }}
              />
              <span className="shrink-0 text-xs">
                <b className="tnum">{s.value.toLocaleString("ko-KR")}</b> <span className="text-[var(--d-ink-2)]">{s.label}</span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
