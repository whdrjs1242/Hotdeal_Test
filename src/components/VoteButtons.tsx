"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

/** 추천/비추천 — 결과는 비율 막대로 객관적으로 */
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
  const [err, setErr] = useState("");

  async function vote(v: 1 | -1) {
    if (!loggedIn) return router.push(`/login?next=/deals/${dealId}`);
    const value = s.mine === v ? 0 : v;
    const prev = s;
    setErr("");
    setS({
      up: s.up + (value === 1 ? 1 : 0) - (s.mine === 1 ? 1 : 0),
      down: s.down + (value === -1 ? 1 : 0) - (s.mine === -1 ? 1 : 0),
      mine: value,
    });
    const res = await fetch(`/api/deals/${dealId}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const d = await res.json();
    if (!res.ok) {
      setS(prev);
      return setErr(d.error ?? "잠시 후 다시 시도해주세요");
    }
    setS({ up: d.votesUp, down: d.votesDown, mine: d.myVote });
  }

  const total = s.up + s.down;
  const pct = total ? Math.round((s.up / total) * 100) : 0;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => vote(1)}
          aria-pressed={s.mine === 1}
          className={`press flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold ${
            s.mine === 1 ? "bg-brand text-white" : "bg-fill text-ink"
          }`}
        >
          <Icon name="thumbUp" size={20} />
          좋은 딜이에요 <span className="tnum">{s.up}</span>
        </button>
        <button
          onClick={() => vote(-1)}
          aria-pressed={s.mine === -1}
          className={`press flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold ${
            s.mine === -1 ? "bg-ink text-surface" : "bg-fill text-ink"
          }`}
        >
          <Icon name="thumbDown" size={20} />
          별로예요 <span className="tnum">{s.down}</span>
        </button>
      </div>
      {total > 0 && (
        <div className="mt-3">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-fill">
            <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] text-muted">
            {total}명 중 {pct}%가 좋은 딜이라고 했어요
          </p>
        </div>
      )}
      {err && <p className="mt-2 text-[13px] text-negative">{err}</p>}
    </div>
  );
}
