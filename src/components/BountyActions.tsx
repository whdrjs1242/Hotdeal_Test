"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

/** 참여자 행동: 같이 찾기(알림) · 현상금 보태기 */
export function BountyActions({
  bountyId,
  joined,
  loggedIn,
  minFund,
}: {
  bountyId: number;
  joined: boolean;
  isOwner?: boolean;
  open?: boolean;
  loggedIn: boolean;
  minFund: number;
}) {
  const router = useRouter();
  const [isJoined, setJoined] = useState(joined);
  const [fundOpen, setFundOpen] = useState(false);
  const [amount, setAmount] = useState(String(minFund * 2));
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const need = () => {
    if (!loggedIn) router.push(`/login?next=/bounties/${bountyId}`);
    return !loggedIn;
  };

  async function join() {
    if (need()) return;
    const res = await fetch(`/api/bounties/${bountyId}/join`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) return setMsg({ text: d.error, ok: false });
    setJoined(true);
    setMsg({ text: `상품이 발견되면 알려드릴게요${d.points ? ` · ${d.points}P 적립` : ""}`, ok: true });
    router.refresh();
  }

  async function fund() {
    if (need()) return;
    const res = await fetch(`/api/bounties/${bountyId}/fund`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    const d = await res.json();
    if (!res.ok) return setMsg({ text: d.error, ok: false });
    setFundOpen(false);
    setJoined(true);
    setMsg({ text: `현상금이 ${d.pot.toLocaleString()}P가 됐어요`, ok: true });
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          onClick={join}
          disabled={isJoined}
          className={`press flex h-12 items-center justify-center gap-1.5 rounded-xl text-[15px] font-semibold ${
            isJoined ? "bg-fill text-sub" : "bg-ink text-surface"
          }`}
        >
          {isJoined ? <Icon name="check" size={18} /> : <Icon name="bell" size={18} />}
          {isJoined ? "발견되면 알림을 받아요" : "나도 찾고 있어요"}
        </button>
        <button onClick={() => setFundOpen((v) => !v)} className="press h-12 rounded-xl bg-fill px-4 text-[15px] font-semibold">
          현상금 보태기
        </button>
      </div>
      {fundOpen && (
        <div className="flex gap-2 rounded-xl bg-fill p-2">
          <div className="relative flex-1">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              aria-label="보탤 포인트"
              className="h-10 w-full rounded-lg bg-surface px-3 pr-7 text-[15px] outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">P</span>
          </div>
          <button onClick={fund} className="press h-10 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white">
            보태기
          </button>
        </div>
      )}
      {msg && <p className={`text-[13px] ${msg.ok ? "text-positive" : "text-negative"}`}>{msg.text}</p>}
    </div>
  );
}
