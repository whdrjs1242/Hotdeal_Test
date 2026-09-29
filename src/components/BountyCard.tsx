import Link from "next/link";
import type { BountyCard as Bounty } from "@/lib/bounties";
import { compact, won } from "@/lib/format";
import { Countdown } from "./Countdown";

/** 수배지 카드 — 현상금 포스터 모티프 */
export function BountyCard({ bounty: b, refCode }: { bounty: Bounty; refCode?: string }) {
  const done = b.status !== "open";
  const hit = b.bestPrice != null && b.targetPrice != null && b.bestPrice <= b.targetPrice;
  return (
    <Link
      href={`/bounties/${b.id}${refCode ? `?r=${refCode}` : ""}`}
      className={`wanted relative block overflow-hidden rounded-2xl p-4 active:scale-[0.99] ${done ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--wanted-ink)]/10 ring-2 ring-[var(--wanted-ink)]/20">
          {b.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover sepia-[.25]" />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl">🎯</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="wanted-stamp">WANTED</span>
            {b.foundCount > 0 && (
              <span className="rounded-full bg-[var(--wanted-ink)] px-2 py-0.5 text-[10px] font-bold text-[var(--wanted-bg)]">
                발견 {b.foundCount}
              </span>
            )}
            {!done && (
              <span className="ml-auto text-[11px]">
                <Countdown endsAt={b.expiresAt} />
              </span>
            )}
            {b.status === "awarded" && <span className="ml-auto text-[11px] font-bold">🏆 해결</span>}
          </div>
          <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug">{b.title}</h3>
          <div className="mt-1 text-xs opacity-80">
            {b.targetPrice ? `목표가 ${won(b.targetPrice)} 이하` : "가격 무관 · 최저가 찾기"}
            {b.bestPrice != null && (
              <b className={`ml-1.5 ${hit ? "text-[#1c7c3a] dark:text-[#6ee7a0]" : ""}`}>
                · 현재 최저 {won(b.bestPrice)} {hit ? "✓" : ""}
              </b>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-dashed border-[var(--wanted-ink)]/25 pt-2.5 text-xs">
        <span className="text-base font-black">💰 {compact(b.pot)}P</span>
        <span>🙋 {compact(b.participantCount)}명 찾는 중</span>
        <span>💬 {compact(b.commentCount)}</span>
        <span className="ml-auto truncate opacity-70">수배자 {b.nickname}</span>
      </div>
    </Link>
  );
}
