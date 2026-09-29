import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { cached } from "@/lib/cache";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import { getBounty, getBountyComments, getParticipation, getSubmissions } from "@/lib/bounties";
import { BOUNTY_POLICY, REWARD_POLICY } from "@/lib/rewards";
import { merchantById } from "@/lib/affiliate/merchants";
import { timeAgo, won } from "@/lib/format";
import { BountyActions } from "@/components/BountyActions";
import { HuntForm } from "@/components/HuntForm";
import { Submission } from "@/components/Submission";
import { ShareButton } from "@/components/ShareButton";
import { Comments } from "@/components/Comments";
import { ShareArrival } from "@/components/ShareArrival";
import { Countdown } from "@/components/Countdown";
import { TopBar, Badge } from "@/components/ui";
import { Img } from "@/components/Img";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ r?: string }> };

const load = (id: number) => cached(`bounty:${id}`, 5, () => getBounty(id));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await load(Number((await params).id));
  if (!b) return {};
  const title = `${b.title}${b.targetPrice ? ` ${won(b.targetPrice)} 이하로` : ""} 찾아요`;
  const description = `현상금 ${b.pot.toLocaleString()}P · ${b.participantCount}명이 함께 찾는 중 · 찾아서 올리면 현상금을 받아요`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

export default async function BountyPage({ params, searchParams }: Props) {
  const id = Number((await params).id);
  const [b, user, sp] = await Promise.all([load(id), getCurrentUser(), searchParams]);
  if (!b) notFound();

  const [subs, comments, participation, myVotes] = await Promise.all([
    getSubmissions(id),
    getBountyComments(id),
    user ? getParticipation(id, user.id) : null,
    user
      ? sql<{ dealId: number; value: number }[]>`
          SELECT v.deal_id, v.value FROM deal_votes v JOIN deals d ON d.id = v.deal_id
          WHERE d.bounty_id = ${id} AND v.user_id = ${user.id}`
      : [],
  ]);
  const voteOf = new Map(myVotes.map((v) => [v.dealId, v.value]));
  const open = b.status === "open" && new Date(b.expiresAt) > new Date();
  const isOwner = user?.id === b.userId;
  const shareUrl = `${env.siteUrl}/bounties/${b.id}${user ? `?r=${user.refCode}` : ""}`;
  const refQuery = user ? `?r=${user.refCode}` : sp.r ? `?r=${encodeURIComponent(sp.r)}` : "";

  return (
    <article className="pb-10">
      <ShareArrival type="bounty" id={b.id} code={sp.r} />
      <TopBar title="수배" />

      <section className="bg-surface px-5 pb-5 pt-2">
        <div className="flex items-center gap-2 text-[13px]">
          {open ? <Badge tone="brand">찾는 중</Badge> : <Badge>{b.status === "awarded" ? "해결됨" : "마감"}</Badge>}
          {open && (
            <span className="text-muted">
              <Countdown endsAt={b.expiresAt} />
            </span>
          )}
        </div>
        <div className="mt-2 flex gap-3.5">
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-bold leading-snug">{b.title}</h1>
            <p className="mt-1 text-[13px] text-muted">
              {b.nickname}님의 요청 · {timeAgo(b.createdAt)}
            </p>
          </div>
          {b.imageUrl && (
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-fill">
              <Img src={b.imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
        {b.description && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-fill px-4 py-3 text-[14px] leading-relaxed text-sub">{b.description}</p>}
        <dl className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl border border-line py-3 text-center">
          <div>
            <dt className="text-[12px] text-muted">목표가</dt>
            <dd className="tnum mt-0.5 text-[15px] font-semibold">{b.targetPrice ? won(b.targetPrice) : "최저가"}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">현상금</dt>
            <dd className="tnum mt-0.5 text-[15px] font-bold text-brand">{b.pot.toLocaleString()}P</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">함께 찾는 사람</dt>
            <dd className="tnum mt-0.5 text-[15px] font-semibold">{b.participantCount}명</dd>
          </div>
        </dl>

        {open && (
          <div className="mt-4 space-y-2">
            {isOwner ? (
              <p className="rounded-xl bg-fill px-4 py-3 text-[14px] text-sub">
                마음에 드는 상품을 <b className="text-ink">채택</b>하면 찾은 분께 현상금이 지급돼요. 마감까지 채택하지 않으면 평가가 가장 좋은 상품이 자동 채택되고, 없으면 현상금을
                돌려드려요.
              </p>
            ) : (
              <>
                <HuntForm bountyId={b.id} category={b.category} loggedIn={!!user} targetPrice={b.targetPrice} />
                <BountyActions bountyId={b.id} joined={Boolean(participation)} loggedIn={!!user} minFund={BOUNTY_POLICY.minFund} />
              </>
            )}
          </div>
        )}
        <div className="mt-2">
          <ShareButton
            dealId={b.id}
            title={`${b.title} 찾아요 (현상금 ${b.pot.toLocaleString()}P)`}
            shareUrl={shareUrl}
            trackPath={`/api/bounties/${b.id}/share`}
            label="이 수배 알리기"
            rewardText={user ? "친구가 이 링크로 들어오면 10P를 드려요" : "로그인하고 공유하면 방문 포인트를 받아요"}
          />
        </div>
      </section>

      <section className="mt-2 bg-surface px-5 pt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold">
            찾은 상품 <span className="text-muted">{subs.length}</span>
          </h2>
          {subs.length > 1 && <span className="text-[12px] text-muted">좋은 평가 순</span>}
        </div>
        <div className="divide-y divide-line">
          {subs.map((s) => (
            <Submission
              key={s.id}
              bountyId={b.id}
              s={{ ...s, merchantName: merchantById(s.merchant).name }}
              myVote={voteOf.get(s.id) ?? 0}
              canAward={isOwner && open}
              awarded={b.awardedDealId === s.id}
              loggedIn={!!user}
              targetPrice={b.targetPrice}
              refQuery={refQuery}
            />
          ))}
          {subs.length === 0 && <p className="py-8 text-center text-[14px] text-muted">아직 찾은 상품이 없어요.</p>}
        </div>
        <p className="border-t border-line py-4 text-[12px] leading-relaxed text-muted">
          채택되면 찾은 분이 현상금의 {100 - BOUNTY_POLICY.platformFeeRate * 100}%를 받아요. 찾은 상품이 구매로 이어지면 찾은 분{" "}
          {REWARD_POLICY.hunterRate * 100}%, 공유한 분 {REWARD_POLICY.sharerRate * 100}%, 수배한 분 {REWARD_POLICY.bountyPosterRate * 100}%의 비율로 포인트가 계속
          쌓여요.
        </p>
      </section>

      <div className="mt-2">
        <Comments
          dealId={b.id}
          initial={comments}
          loggedIn={!!user}
          endpoint={`/api/bounties/${b.id}/comments`}
          nextPath={`/bounties/${b.id}`}
          placeholder="어디서 본 것 같다면 알려주세요"
        />
      </div>
    </article>
  );
}
