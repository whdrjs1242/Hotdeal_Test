"use client";
import { useEffect, useState } from "react";

/** 남은 시간. 1시간 이내면 초 단위 + 강조 */
export function Countdown({ endsAt, suffix = " 남음" }: { endsAt: string | Date; suffix?: string; big?: boolean }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now == null) return null;
  const left = Math.max(0, end - now);
  if (left === 0) return <span className="text-muted">마감</span>;
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const text =
    h >= 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간` : h >= 1 ? `${h}시간 ${m}분` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return (
    <span className={`tnum ${h < 1 ? "font-semibold text-negative" : ""}`}>
      {text}
      {suffix}
    </span>
  );
}
