"use client";
import { useState } from "react";

const REASONS = [
  { id: "soldout", label: "품절됐어요" },
  { id: "price_changed", label: "가격이 올랐어요" },
  { id: "spam", label: "광고/스팸" },
];

export function ReportButtons({ dealId, loggedIn }: { dealId: number; loggedIn: boolean }) {
  const [done, setDone] = useState<string | null>(null);
  async function report(reason: string) {
    if (!loggedIn) return (location.href = `/login?next=/deals/${dealId}`);
    await fetch(`/api/deals/${dealId}/report`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setDone(reason);
  }
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs text-sub">
      <span>딜 상태 제보:</span>
      {REASONS.map((r) => (
        <button
          key={r.id}
          disabled={!!done}
          onClick={() => report(r.id)}
          className={`rounded-full border border-line px-2.5 py-1 ${done === r.id ? "bg-ink text-surface" : ""}`}
        >
          {r.label}
        </button>
      ))}
      {done && <span>고마워요! 🙏</span>}
    </div>
  );
}
