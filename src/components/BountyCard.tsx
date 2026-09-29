import Link from "next/link";
import type { BountyCard as Bounty } from "@/lib/bounties";
import { won } from "@/lib/format";
import { Countdown } from "./Countdown";
import { Badge } from "./ui";
import { Img } from "@/components/Img";

/** 수배 목록 한 줄: 무엇을 · 얼마 이하로 · 현상금 · 진행 상태 */
export function BountyCard({ bounty: b, refCode }: { bounty: Bounty; refCode?: string }) {
  const open = b.status === "open" && new Date(b.expiresAt) > new Date();
  const hit = b.bestPrice != null && b.targetPrice != null && b.bestPrice <= b.targetPrice;
  return (
    <Link href={`/bounties/${b.id}${refCode ? `?r=${refCode}` : ""}`} className="flex gap-3.5 bg-surface px-5 py-4 active:bg-fill">
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-fill">
        {b.imageUrl && (
          <Img src={b.imageUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {open ? (
            b.foundCount > 0 ? <Badge tone="positive">발견 {b.foundCount}건</Badge> : <Badge tone="brand">찾는 중</Badge>
          ) : (
            <Badge>{b.status === "awarded" ? "해결됨" : "마감"}</Badge>
          )}
          {open && (
            <span className="ml-auto text-[12px] text-muted">
              <Countdown endsAt={b.expiresAt} />
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-1 text-[15px] font-semibold">{b.title}</p>
        <p className="text-[13px] text-sub">
          {b.targetPrice ? `${won(b.targetPrice)} 이하` : "가장 싼 곳"}
          {b.bestPrice != null && <span className={hit ? "text-positive" : ""}> · 지금 최저 {won(b.bestPrice)}</span>}
        </p>
        <div className="mt-1 flex items-center gap-2.5 text-[12px] text-muted">
          <span className="tnum font-semibold text-brand">현상금 {b.pot.toLocaleString()}P</span>
          <span>{b.participantCount}명이 찾는 중</span>
          <span>댓글 {b.commentCount}</span>
        </div>
      </div>
    </Link>
  );
}
