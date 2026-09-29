"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { won } from "@/lib/format";
import { Icon } from "./Icon";
import { Badge } from "./ui";
import { Img } from "@/components/Img";

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

/** 찾은 상품 한 줄: 평가 · 구매 · (수배자) 채택 */
export function Submission({
  s,
  bountyId,
  myVote,
  canAward,
  awarded,
  loggedIn,
  targetPrice,
  refQuery,
}: {
  s: S;
  rank?: number;
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
  const [err, setErr] = useState("");

  async function vote(value: 1 | -1) {
    if (!loggedIn) return router.push(`/login?next=/bounties/${bountyId}`);
    const next = v.mine === value ? 0 : value;
    const res = await fetch(`/api/deals/${s.id}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: next }),
    });
    const d = await res.json();
    if (!res.ok) return setErr(d.error);
    setV({ up: d.votesUp, down: d.votesDown, mine: d.myVote });
  }

  async function award() {
    if (!confirm("이 상품을 채택할까요? 현상금이 찾은 분께 지급되고 되돌릴 수 없어요.")) return;
    const res = await fetch(`/api/bounties/${bountyId}/award`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId: s.id }),
    });
    const d = await res.json();
    if (!res.ok) return setErr(d.error);
    router.refresh();
  }

  const diff = targetPrice != null && s.price != null ? s.price - targetPrice : null;
  return (
    <div className="py-4">
      <div className="flex gap-3">
        <Link href={`/deals/${s.id}${refQuery}`} className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-fill">
          {s.imageUrl && (
            <Img src={s.imageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[12px] text-muted">
            {awarded && <Badge tone="positive">채택됨</Badge>}
            <span>{s.merchantName}</span>
            <span>·</span>
            <span>{s.nickname}님이 찾음</span>
          </div>
          <Link href={`/deals/${s.id}${refQuery}`} className="mt-0.5 line-clamp-2 text-[15px] leading-snug">
            {s.title}
          </Link>
          <p className="mt-0.5 text-[15px] font-bold">
            {s.price != null ? won(s.price) : "가격 확인 필요"}
            {diff != null && (
              <span className={`ml-1.5 text-[12px] font-semibold ${diff <= 0 ? "text-positive" : "text-muted"}`}>
                {diff <= 0 ? `목표가 달성` : `목표가 +${diff.toLocaleString()}원`}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <button
          onClick={() => vote(1)}
          aria-pressed={v.mine === 1}
          className={`press flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold ${v.mine === 1 ? "bg-brand text-white" : "bg-fill"}`}
        >
          <Icon name="thumbUp" size={16} /> {v.up}
        </button>
        <button
          onClick={() => vote(-1)}
          aria-pressed={v.mine === -1}
          className={`press flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold ${v.mine === -1 ? "bg-ink text-surface" : "bg-fill"}`}
        >
          <Icon name="thumbDown" size={16} /> {v.down}
        </button>
        {canAward ? (
          <button onClick={award} className="press ml-auto h-9 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white">
            이 상품 채택하기
          </button>
        ) : (
          <a href={`/go/${s.id}${refQuery}`} target="_blank" rel="noopener sponsored" className="press ml-auto flex h-9 items-center rounded-lg bg-ink px-3.5 text-[13px] font-semibold text-surface">
            구매하러 가기
          </a>
        )}
      </div>
      {err && <p className="mt-2 text-[13px] text-negative">{err}</p>}
    </div>
  );
}
