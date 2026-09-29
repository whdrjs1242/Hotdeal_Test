"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BountyActions({
  bountyId,
  joined,
  isOwner,
  open,
  loggedIn,
  minFund,
}: {
  bountyId: number;
  joined: boolean;
  isOwner: boolean;
  open: boolean;
  loggedIn: boolean;
  minFund: number;
}) {
  const router = useRouter();
  const [isJoined, setJoined] = useState(joined);
  const [fundOpen, setFundOpen] = useState(false);
  const [amount, setAmount] = useState(String(minFund * 2));
  const [toast, setToast] = useState("");

  const need = () => {
    if (!loggedIn) router.push(`/login?next=/bounties/${bountyId}`);
    return !loggedIn;
  };
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2000);
  };

  async function join() {
    if (need()) return;
    const res = await fetch(`/api/bounties/${bountyId}/join`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) return flash(d.error);
    setJoined(true);
    flash(d.points ? `🙋 참여 완료! +${d.points}P · 발견되면 바로 알려드려요` : "🙋 참여 중이에요");
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
    if (!res.ok) return flash(d.error);
    setFundOpen(false);
    setJoined(true);
    flash(`💰 현상금이 ${d.pot.toLocaleString()}P가 됐어요!`);
    router.refresh();
  }

  if (!open) return null;
  return (
    <div className="space-y-2">
      {!isOwner && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={join}
            disabled={isJoined}
            className={`h-12 rounded-xl text-sm font-bold ${isJoined ? "bg-canvas text-sub" : "bg-ink text-surface"}`}
          >
            {isJoined ? "✓ 같이 찾는 중" : "🙋 나도 찾아요"}
          </button>
          <button onClick={() => setFundOpen((v) => !v)} className="h-12 rounded-xl bg-[#c2410c] text-sm font-bold text-white">
            💰 현상금 올리기
          </button>
        </div>
      )}
      {fundOpen && (
        <div className="flex gap-2 rounded-xl bg-surface p-2 ring-1 ring-line">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            className="h-10 min-w-0 flex-1 rounded-lg bg-canvas px-3 text-sm outline-none"
          />
          <button onClick={fund} className="h-10 rounded-lg bg-[#c2410c] px-4 text-sm font-bold text-white">
            P 올리기
          </button>
        </div>
      )}
      {toast && <p className="rounded-xl bg-ink px-3 py-2 text-center text-sm text-surface">{toast}</p>}
    </div>
  );
}
