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
import { Icon } from "@/components/Icon";
import { ShareArrival } from "@/components/ShareArrival";
import { TopBar, Badge } from "@/components/ui";
import { Img } from "@/components/Img";

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
      ? `친구가 이 링크로 들어오면 10P, 구매하면 수수료의 ${REWARD_POLICY.sharerRate * 100}%를 포인트로 드려요`
      : "친구가 이 링크로 들어올 때마다 10P를 드려요";
  const lv = levelOf(deal.userXp);

  return (
    <article className="pb-28">
      <ShareArrival type="deal" id={deal.id} code={sp.r} />
      <TopBar title={merchant.name} />

      <div className="relative aspect-square w-full bg-fill">
        {deal.imageUrl && (
          <Img src={deal.imageUrl} alt={deal.title} className={`h-full w-full object-contain ${ended ? "opacity-40" : ""}`} />
        )}
        {ended && (
          <span className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-ink/80 px-4 py-2 text-[14px] font-semibold text-surface">
            {deal.status === "soldout" ? "품절된 딜이에요" : "종료된 딜이에요"}
          </span>
        )}
      </div>

      <section className="bg-surface px-5 pb-5 pt-4">
        {deal.bountyId && (
          <Link href={`/bounties/${deal.bountyId}`} className="mb-3 flex items-center gap-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-[14px] text-brand">
            <Icon name="target" size={18} />
            수배 요청으로 찾은 상품이에요
            <Icon name="chevron" size={16} className="ml-auto" />
          </Link>
        )}
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <span>{merchant.name}</span>
          <span>·</span>
          <span>{timeAgo(deal.createdAt)}</span>
          {deal.endsAt && !ended && (
            <span className="ml-auto flex items-center gap-1">
              <Icon name="clock" size={15} />
              <Countdown endsAt={deal.endsAt} />
            </span>
          )}
        </div>
        <h1 className="mt-1.5 text-[19px] font-semibold leading-snug">{deal.title}</h1>
        <div className="mt-3 flex items-baseline gap-2">
          {off > 0 && <span className="text-[24px] font-bold text-brand">{off}%</span>}
          <span className="tnum text-[24px] font-bold">{deal.price != null ? won(deal.price) : "가격은 판매처에서 확인"}</span>
          {deal.originalPrice && off > 0 && <span className="tnum text-[15px] text-muted line-through">{won(deal.originalPrice)}</span>}
        </div>
        {deal.shipping && <p className="mt-1 text-[14px] text-sub">배송 {deal.shipping}</p>}
        {deal.description && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{deal.description}</p>}
        <Link href={deal.handle ? `/@${deal.handle}` : "#"} className="mt-5 flex items-center gap-2.5 border-t border-line pt-4 text-[14px]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fill text-[16px]">{deal.userChar ?? deal.nickname.slice(0, 1)}</span>
          <span className="font-semibold">{deal.nickname}</span>
          <Badge>Lv.{lv.level} {lv.name}</Badge>
          {deal.handle && <Icon name="chevron" size={16} className="ml-auto text-muted" />}
        </Link>
      </section>

      <section className="mt-2 bg-surface px-5 py-5">
        <h2 className="mb-3 text-[17px] font-bold">이 딜 어때요?</h2>
        <VoteButtons dealId={deal.id} initialUp={deal.votesUp} initialDown={deal.votesDown} initialMine={myVote} loggedIn={!!user} />
        <div className="mt-3">
          <ShareButton dealId={deal.id} title={deal.title} shareUrl={shareUrl} rewardText={rewardText} label="친구에게 알려주기" />
        </div>
      </section>

      {history.length >= 2 && (
        <div className="mt-2">
          <Sparkline points={history} />
        </div>
      )}

      <div className="mt-2 space-y-2">
        <Comments dealId={deal.id} initial={comments} loggedIn={!!user} />
        <ReportButtons dealId={deal.id} loggedIn={!!user} />
      </div>

      <p className="px-5 py-5 text-[12px] leading-relaxed text-muted">
        가격과 재고는 판매처 사정에 따라 바뀔 수 있어요.
        {deal.monetized &&
          (merchant.id === "coupang"
            ? " 이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
            : " 구매 시 줍줍이 판매처로부터 일정 수수료를 받을 수 있으며, 구매 가격에는 영향이 없습니다.")}
      </p>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md gap-2 border-t border-line bg-surface px-4 pt-2.5 pb-2.5">
        <ShareButton dealId={deal.id} title={deal.title} shareUrl={shareUrl} rewardText={rewardText} variant="icon" />
        <a
          href={buyHref}
          target="_blank"
          rel="noopener sponsored"
          className={`press flex h-[52px] flex-1 items-center justify-center rounded-xl text-[16px] font-semibold ${
            ended ? "bg-fill text-sub" : "bg-brand text-white"
          }`}
        >
          {ended ? "판매처에서 확인하기" : `${merchant.name}에서 구매하기`}
        </a>
      </div>
    </article>
  );
}
