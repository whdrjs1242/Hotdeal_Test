"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { temperature } from "@/lib/ranking";

export function VoteButtons({
  dealId,
  initialUp,
  initialDown,
  initialMine,
  loggedIn,
}: {
  dealId: number;
  initialUp: number;
  initialDown: number;
  initialMine: number;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [s, setS] = useState({ up: initialUp, down: initialDown, mine: initialMine });
  const [pop, setPop] = useState(0);
  const temp = temperature(s.up, s.down);

  async function vote(v: 1 | -1) {
    if (!loggedIn) return router.push(`/login?next=/deals/${dealId}`);
    const value = s.mine === v ? 0 : v;
    // 낙관적 업데이트
    const prev = s;
    setS({
      up: s.up + (value === 1 ? 1 : 0) - (s.mine === 1 ? 1 : 0),
      down: s.down + (value === -1 ? 1 : 0) - (s.mine === -1 ? 1 : 0),
      mine: value,
    });
    setPop((p) => p + 1);
    const res = await fetch(`/api/deals/${dealId}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      setS(prev);
      const e = await res.json().catch(() => ({}));
      alert(e.error ?? "투표에 실패했어요");
      return;
    }
    const d = await res.json();
    setS({ up: d.votesUp, down: d.votesDown, mine: d.myVote });
  }

  const pct = Math.max(0, Math.min(100, ((temp - 20) / 60) * 100));
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-sub">딜 온도</span>
        <span key={pop} className={`animate-pop text-xl font-black ${temp >= 50 ? "text-brand" : temp < 36.5 ? "text-cool" : ""}`}>
          {temp >= 60 ? "🔥🔥" : temp >= 50 ? "🔥" : "🌡️"} {temp}°C
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cool via-amber-400 to-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => vote(1)}
          className={`h-11 rounded-xl text-sm font-bold ${s.mine === 1 ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}
        >
          🔥 핫해요 {s.up}
        </button>
        <button
          onClick={() => vote(-1)}
          className={`h-11 rounded-xl text-sm font-bold ${s.mine === -1 ? "bg-cool text-white" : "bg-canvas text-cool"}`}
        >
          🧊 별로예요 {s.down}
        </button>
      </div>
    </div>
  );
}
