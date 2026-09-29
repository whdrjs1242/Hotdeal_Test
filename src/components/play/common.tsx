"use client";
import { useEffect, useRef, useState } from "react";

export const n = (v: number) => v.toLocaleString("ko-KR");

/** 숫자가 부드럽게 바뀌는 카운터 */
export function useCountUp(value: number, ms = 500) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setShown(Math.round(a + (value - a) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

export function Marbles({ value, className = "" }: { value: number; className?: string }) {
  const shown = useCountUp(value);
  return (
    <span className={`tnum inline-flex items-center gap-1.5 ${className}`}>
      <span className="inline-block h-3 w-3 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0,#8fc5ff_35%,#3182f6_100%)]" />
      {n(shown)}
    </span>
  );
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error ?? "잠시 후 다시 시도해주세요");
  return d as T;
}

export function useToast() {
  const [msg, setMsg] = useState("");
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = (m: string) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(""), 2200);
  };
  const node = msg ? (
    <div role="status" className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[88%] rounded-xl bg-ink/90 px-4 py-3 text-center text-[14px] text-surface shadow-lg">
      {msg}
    </div>
  ) : null;
  return { show, node };
}

/** 확률·환급률 공개 표 */
export function OddsTable({ rows, rtp, note }: { rows: { label: string; value: string }[]; rtp: string; note?: string }) {
  return (
    <details className="rounded-xl bg-fill px-4 py-3 text-[13px] text-sub">
      <summary className="cursor-pointer font-semibold text-ink">확률 보기</summary>
      <table className="tnum mt-2 w-full">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-line last:border-0">
              <td className="py-1.5">{r.label}</td>
              <td className="py-1.5 text-right">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2">이론 환급률 {rtp}{note ? ` · ${note}` : ""}</p>
    </details>
  );
}
