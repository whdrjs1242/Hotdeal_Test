import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getComments, getDeal, getMyVote, getPriceHistory } from "@/lib/deals";
import { getCurrentUser } from "@/lib/auth";
import { cached } from "@/lib/cache";
import { env } from "@/lib/env";
import { discountRate } from "@/lib/ranking";
import { timeAgo, won } from "@/lib/format";
import { merchantById } from "@/lib/affiliate/merchants";
import { REWARD_POLICY } from "@/lib/rewards";
import { levelOf } from "@/lib/levels";
import { VoteButtons } from "@/components/VoteButtons";
import { ShareButton } from "@/components/ShareButton";
import { Comments } from "@/components/Comments";
import { ReportButtons } from "@/components/ReportButtons";
import { Sparkline } from "@/components/Sparkline";
import { Countdown } from "@/components/Countdown";
import { BackButton } from "@/components/BackButton";
import { ShareArrival } from "@/components/ShareArrival";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ r?: string }> };

const loadDeal = (id: number) => cached(`deal:${id}`, 10, () => getDeal(id));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const deal = await loadDeal(Number((await params).id));
  if (!deal) return {};
  const off = discountRate(deal.price, deal.originalPrice);
  const title = `${off ? `[${off}%] ` : ""}${deal.title}`;
  const description = `${deal.price != null ? won(deal.price) : ""} · ${merchantById(deal.merchant).name} · 줍줍 핫딜`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `/deals/${deal.id}` },
  };
}

export default async function DealPage({ params, searchParams }: Props) {
  const id = Number((await params).id);
  const [deal, user, sp] = await Promise.all([loadDeal(id), getCurrentUser(), searchParams]);
  if (!deal) notFound();

  const [comments, history, myVote] = await Promise.all([
    getComments(id),
    getPriceHistory(deal.canonicalUrl),
    user ? getMyVote(id, user.id) : 0,
  ]);

  const merchant = merchantById(deal.merchant);
  const off = discountRate(deal.price, deal.originalPrice);
  const ended = deal.status !== "active";
  const shareUrl = `${env.siteUrl}/deals/${deal.id}${user ? `?r=${user.refCode}` : ""}`;
  const buyHref = `/go/${deal.id}${sp.r ? `?r=${encodeURIComponent(sp.r)}` : ""}`;
  const rewardText = !user
    ? "로그인하고 공유하면 친구가 들어올 때마다 포인트를 받아요"
    : merchant.rewardEligible
      ? `친구가 들어오면 포인트, 구매로 이어지면 구매 기여 포인트(${REWARD_POLICY.sharerRate * 100}%)까지!`
      : "친구가 들어올 때마다 포인트가 쌓이고 헌터 랭킹이 올라가요";
  const lv = levelOf(deal.userXp);

  return (
    <article className="pb-24">
      <ShareArrival type="deal" id={deal.id} code={sp.r} />
      <div className="pt-safe sticky top-0 z-30 flex h-12 items-center gap-2 bg-surface/95 px-2 backdrop-blur">
        <BackButton />
        <span className="truncate text-sm font-semibold">{merchant.name} 핫딜</span>
      </div>

      <div className="relative aspect-square w-full bg-surface">
        {deal.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deal.imageUrl} alt={deal.title} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl">🛍️</div>
        )}
        {ended && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-black text-white">
            {deal.status === "soldout" ? "품절된 딜이에요" : "종료된 딜이에요"}
          </div>
        )}
      </div>

      <section className="bg-surface px-4 pb-4 pt-3">
        {deal.bountyId && (
          <Link href={`/bounties/${deal.bountyId}`} className="wanted mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold">
            🎯 현상금 수배에서 발견된 상품이에요 <span className="ml-auto">수배 보기 ›</span>
          </Link>
        )}
        <div className="flex items-center gap-2 text-xs text-sub">
          <span className="rounded bg-canvas px-1.5 py-0.5 font-semibold text-ink/80">{merchant.name}</span>
          <span>{timeAgo(deal.createdAt)}</span>
          {deal.endsAt && !ended && (
            <span className="ml-auto">
              <Countdown endsAt={deal.endsAt} big />
            </span>
          )}
        </div>
        <h1 className="mt-2 text-lg font-bold leading-snug">{deal.title}</h1>
        <div className="mt-2 flex items-baseline gap-2">
          {off > 0 && <span className="text-2xl font-black text-brand">{off}%</span>}
          <span className="text-2xl font-black">{deal.price != null ? won(deal.price) : "가격은 링크에서 확인"}</span>
          {deal.originalPrice && off > 0 && <span className="text-sm text-sub line-through">{won(deal.originalPrice)}</span>}
        </div>
        {deal.shipping && <p className="mt-1 text-sm text-sub">🚚 {deal.shipping}</p>}
        {deal.description && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{deal.description}</p>}
        <Link
          href={deal.handle ? `/@${deal.handle}` : "#"}
          className="mt-4 flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm"
        >
          <span className="text-lg">{lv.emoji}</span>
          <span className="font-semibold">{deal.nickname}</span>
          <span className="text-xs text-sub">{lv.name}</span>
          {deal.handle && <span className="ml-auto text-xs text-sub">채널 보기 ›</span>}
        </Link>
      </section>

      <div className="mt-2 space-y-2 px-3">
        <VoteButtons
          dealId={deal.id}
          initialUp={deal.votesUp}
          initialDown={deal.votesDown}
          initialMine={myVote}
          loggedIn={!!user}
        />
        <ShareButton dealId={deal.id} title={deal.title} shareUrl={shareUrl} rewardText={rewardText} />
        <Sparkline points={history} />
      </div>

      <div className="mt-2">
        <ReportButtons dealId={deal.id} loggedIn={!!user} />
        <Comments dealId={deal.id} initial={comments} loggedIn={!!user} />
      </div>

      <p className="px-4 py-4 text-[11px] leading-relaxed text-sub">
        가격과 재고는 판매처 사정에 따라 바뀔 수 있어요.
        {deal.monetized &&
          (merchant.id === "coupang"
            ? " 이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
            : " 구매 시 줍줍이 판매처로부터 일정 수수료를 받을 수 있으며, 구매 가격에는 영향이 없습니다.")}
      </p>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md gap-2 border-t border-line bg-surface px-3 pt-2 pb-2">
        <ShareButton dealId={deal.id} title={deal.title} shareUrl={shareUrl} rewardText={rewardText} variant="icon" />
        <a
          href={buyHref}
          target="_blank"
          rel="noopener sponsored"
          className={`flex h-12 flex-1 items-center justify-center rounded-xl text-[16px] font-bold text-white ${
            ended ? "bg-sub" : "bg-brand active:bg-brand-dark"
          }`}
        >
          {ended ? "판매처에서 확인하기" : `${merchant.name}에서 구매하기`}
        </a>
      </div>
    </article>
  );
}
