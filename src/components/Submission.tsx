"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { won } from "@/lib/format";
import { discountRate } from "@/lib/ranking";

interface S {
  id: number;
  title: string;
  imageUrl: string | null;
  price: number | null;
  originalPrice: number | null;
  merchantName: string;
  votesUp: number;
  votesDown: number;
  clickCount: number;
  nickname: string;
}

/** 발견 상품: 유저 평가(👍/👎) + 구매 + 수배자 채택 */
export function Submission({
  s,
  rank,
  bountyId,
  myVote,
  canAward,
  awarded,
  loggedIn,
  targetPrice,
  refQuery,
}: {
  s: S;
  rank: number;
  bountyId: number;
  myVote: number;
  canAward: boolean;
  awarded: boolean;
  loggedIn: boolean;
  targetPrice: number | null;
  refQuery: string;
}) {
  const router = useRouter();
  const [v, setV] = useState({ up: s.votesUp, down: s.votesDown, mine: myVote });

  async function vote(value: 1 | -1) {
    if (!loggedIn) return router.push(`/login?next=/bounties/${bountyId}`);
    const next = v.mine === value ? 0 : value;
    const res = await fetch(`/api/deals/${s.id}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: next }),
    });
    const d = await res.json();
    if (!res.ok) return alert(d.error);
    setV({ up: d.votesUp, down: d.votesDown, mine: d.myVote });
  }

  async function award() {
    if (!confirm("이 상품을 채택하고 현상금을 지급할까요? 되돌릴 수 없어요.")) return;
    const res = await fetch(`/api/bounties/${bountyId}/award`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId: s.id }),
    });
    const d = await res.json();
    if (!res.ok) return alert(d.error);
    router.refresh();
  }

  const hit = targetPrice != null && s.price != null && s.price <= targetPrice;
  const off = discountRate(s.price, s.originalPrice);
  return (
    <div className={`rounded-2xl bg-surface p-3 ring-1 ${awarded ? "ring-2 ring-[#c2410c]" : "ring-line"}`}>
      {awarded && <div className="mb-2 text-xs font-black text-[#c2410c]">🏆 채택된 발견 상품</div>}
      <div className="flex gap-3">
        <Link href={`/deals/${s.id}${refQuery}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-canvas">
          {s.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">🛍️</div>
          )}
          <span className="absolute left-1 top-1 rounded bg-ink/80 px-1 text-[10px] font-bold text-white">#{rank}</span>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-sub">
            {s.merchantName} · 헌터 {s.nickname}
          </div>
          <Link href={`/deals/${s.id}${refQuery}`} className="line-clamp-2 text-sm font-semibold leading-snug">
            {s.title}
          </Link>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            {off > 0 && <span className="text-sm font-black text-brand">{off}%</span>}
            <span className="font-black">{s.price != null ? won(s.price) : "가격 확인"}</span>
            {hit && <span className="text-[11px] font-bold text-[#1c7c3a] dark:text-[#6ee7a0]">✓ 목표가 달성</span>}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => vote(1)} className={`h-9 rounded-lg px-3 text-xs font-bold ${v.mine === 1 ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>
          👍 진짜예요 {v.up}
        </button>
        <button onClick={() => vote(-1)} className={`h-9 rounded-lg px-3 text-xs font-bold ${v.mine === -1 ? "bg-cool text-white" : "bg-canvas text-cool"}`}>
          👎 아니에요 {v.down}
        </button>
        <a
          href={`/go/${s.id}${refQuery}`}
          target="_blank"
          rel="noopener sponsored"
          className="ml-auto flex h-9 items-center rounded-lg bg-ink px-3 text-xs font-bold text-surface"
        >
          구매하러 가기
        </a>
      </div>
      {canAward && (
        <button onClick={award} className="mt-2 h-9 w-full rounded-lg bg-[#c2410c] text-xs font-bold text-white">
          🏆 이 상품 채택하고 현상금 지급
        </button>
      )}
    </div>
  );
}
