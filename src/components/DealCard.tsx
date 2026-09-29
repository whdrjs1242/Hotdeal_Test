import Link from "next/link";
import type { DealCard as Deal } from "@/lib/deals";
import { discountRate } from "@/lib/ranking";
import { timeAgo, won } from "@/lib/format";
import { merchantById } from "@/lib/affiliate/merchants";
import { Countdown } from "./Countdown";
import { Badge } from "./ui";
import { Img } from "@/components/Img";

/** 딜 목록 한 줄: 이미지 · 판매처/시간 · 제목 · 가격 · 반응 */
export function DealCard({ deal, refCode }: { deal: Deal; rank?: number; refCode?: string }) {
  const off = discountRate(deal.price, deal.originalPrice);
  const ended = deal.status !== "active";
  return (
    <Link href={`/deals/${deal.id}${refCode ? `?r=${refCode}` : ""}`} className="flex gap-3.5 bg-surface px-5 py-4 active:bg-fill">
      <div className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-lg bg-fill">
        {deal.imageUrl && (
          <Img src={deal.imageUrl} className={`h-full w-full object-cover ${ended ? "opacity-40" : ""}`} />
        )}
        {ended && (
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-sub">
            {deal.status === "soldout" ? "품절" : "종료"}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[12px] text-muted">
          {deal.bountyId && <Badge tone="brand">수배 발견</Badge>}
          <span>{merchantById(deal.merchant).name}</span>
          <span>·</span>
          <span>{timeAgo(deal.createdAt)}</span>
        </div>
        <p className={`mt-0.5 line-clamp-2 text-[15px] leading-[1.4] ${ended ? "text-muted" : ""}`}>{deal.title}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          {off > 0 && <span className="text-[15px] font-bold text-brand">{off}%</span>}
          <span className="tnum text-[16px] font-bold">{deal.price != null ? won(deal.price) : "가격 확인 필요"}</span>
          {deal.shipping && <span className="text-[12px] text-muted">{deal.shipping}</span>}
        </div>
        <div className="mt-1 flex items-center gap-2.5 text-[12px] text-muted">
          <span>추천 {deal.votesUp}</span>
          <span>댓글 {deal.commentCount}</span>
          {deal.endsAt && !ended && (
            <span className="ml-auto">
              <Countdown endsAt={deal.endsAt} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
