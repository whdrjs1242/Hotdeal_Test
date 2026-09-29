"use client";
import { useEffect, useState } from "react";

/** 마감 임박 타이머 — 1시간 이내면 초 단위로 긴박감 표시 */
export function Countdown({ endsAt, big = false }: { endsAt: string | Date; big?: boolean }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now == null) return null;
  const left = Math.max(0, end - now);
  if (left === 0) return <span className="font-bold text-sub">마감</span>;
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const text = h >= 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return (
    <span className={`font-bold tabular-nums ${h < 1 ? "text-brand" : "text-ink/70"} ${big ? "text-base" : ""}`}>
      ⏰ {text}
    </span>
  );
}
