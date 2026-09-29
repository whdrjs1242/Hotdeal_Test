"use client";
import { useState } from "react";

const REASONS = [
  { id: "soldout", label: "품절됐어요" },
  { id: "price_changed", label: "가격이 바뀌었어요" },
  { id: "spam", label: "광고 같아요" },
];

/** 딜 상태 제보 — 3건이 모이면 자동으로 종료 처리 */
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
    <div className="bg-surface px-5 py-4">
      <p className="text-[13px] text-muted">{done ? "알려주셔서 고마워요. 같은 제보가 3건 모이면 딜이 종료돼요." : "딜 상태가 다른가요?"}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button
            key={r.id}
            disabled={!!done}
            onClick={() => report(r.id)}
            className={`press rounded-full px-3 py-1.5 text-[13px] ring-1 ring-inset ${done === r.id ? "bg-ink text-surface ring-ink" : "text-sub ring-line"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
