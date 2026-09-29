import Link from "next/link";
import type { DealCard as Deal } from "@/lib/deals";
import { discountRate, temperature } from "@/lib/ranking";
import { compact, timeAgo, won } from "@/lib/format";
import { merchantById } from "@/lib/affiliate/merchants";
import { levelOf } from "@/lib/levels";
import { Countdown } from "./Countdown";

export function DealCard({ deal, rank, refCode }: { deal: Deal; rank?: number; refCode?: string }) {
  const off = discountRate(deal.price, deal.originalPrice);
  const temp = temperature(deal.votesUp, deal.votesDown);
  const ended = deal.status !== "active";
  const lv = levelOf(deal.userXp);
  return (
    <Link
      href={`/deals/${deal.id}${refCode ? `?r=${refCode}` : ""}`}
      className={`flex gap-3 bg-surface px-4 py-3 active:bg-canvas ${ended ? "opacity-50" : ""}`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-canvas">
        {deal.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deal.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">🛍️</div>
        )}
        {rank != null && rank < 3 && (
          <span className="absolute left-1 top-1 rounded-md bg-ink/80 px-1.5 text-xs font-bold text-white">{rank + 1}</span>
        )}
        {ended && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">
            {deal.status === "soldout" ? "품절" : "종료"}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-sub">
          {deal.bountyId && <span className="rounded bg-[#fbf1dc] px-1 font-bold text-[#c2410c] dark:bg-[#2a2118]">🎯 수배 발견</span>}
          <span className="font-semibold text-ink/80">{merchantById(deal.merchant).name}</span>
          <span>·</span>
          <span>{timeAgo(deal.createdAt)}</span>
          {deal.endsAt && !ended && <Countdown endsAt={deal.endsAt} />}
        </div>
        <h3 className="mt-0.5 line-clamp-2 text-[15px] font-medium leading-snug">{deal.title}</h3>
        <div className="mt-1 flex items-baseline gap-1.5">
          {off > 0 && <span className="text-[15px] font-extrabold text-brand">{off}%</span>}
          <span className="text-[16px] font-extrabold">{deal.price != null ? won(deal.price) : "가격 확인"}</span>
          {deal.shipping && <span className="text-[11px] text-sub">{deal.shipping}</span>}
        </div>
        <div className="mt-1 flex items-center gap-2.5 text-[11px] text-sub">
          <span className={`font-bold ${temp >= 50 ? "text-brand" : temp < 36.5 ? "text-cool" : "text-ink/70"}`}>
            {temp >= 50 ? "🔥" : "🌡️"} {temp}°
          </span>
          <span>💬 {compact(deal.commentCount)}</span>
          <span>👆 {compact(deal.clickCount)}</span>
          <span className="ml-auto truncate">
            {deal.userChar ?? lv.emoji} {deal.nickname}
          </span>
        </div>
      </div>
    </Link>
  );
}
