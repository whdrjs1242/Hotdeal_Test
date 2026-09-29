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
import { levelOf } from "@/lib/levels";
import { compact, timeAgo, won } from "@/lib/format";
import { BackButton } from "@/components/BackButton";
import { Countdown } from "@/components/Countdown";
import { BountyActions } from "@/components/BountyActions";
import { HuntForm } from "@/components/HuntForm";
import { Submission } from "@/components/Submission";
import { ShareButton } from "@/components/ShareButton";
import { Comments } from "@/components/Comments";
import { ShareArrival } from "@/components/ShareArrival";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ r?: string }> };

const load = (id: number) => cached(`bounty:${id}`, 5, () => getBounty(id));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await load(Number((await params).id));
  if (!b) return {};
  const title = `[수배] ${b.title}${b.targetPrice ? ` ${won(b.targetPrice)} 이하` : ""}`;
  const description = `현상금 ${b.pot.toLocaleString()}P · ${b.participantCount}명이 찾는 중 · 찾으면 현상금!`;
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
  const lv = levelOf(b.userXp);

  return (
    <article className="pb-10">
      <ShareArrival type="bounty" id={b.id} code={sp.r} />
      <div className="pt-safe sticky top-0 z-30 flex h-12 items-center gap-2 bg-surface/95 px-2 backdrop-blur">
        <BackButton />
        <span className="truncate text-sm font-semibold">현상금 수배</span>
      </div>

      <section className="wanted mx-3 mt-2 rounded-3xl p-5 text-center">
        <div className="wanted-stamp text-base">WANTED</div>
        <div className="mx-auto mt-3 h-36 w-36 overflow-hidden rounded-2xl ring-4 ring-[var(--wanted-ink)]/20">
          {b.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.imageUrl} alt="" className="h-full w-full object-cover sepia-[.2]" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--wanted-ink)]/10 text-6xl">🎯</div>
          )}
        </div>
        <h1 className="mt-3 text-xl font-black leading-snug">{b.title}</h1>
        <p className="mt-1 text-sm opacity-80">{b.targetPrice ? `${won(b.targetPrice)} 이하로 찾아주세요` : "가장 싼 곳을 찾아주세요"}</p>
        {b.description && <p className="mt-3 whitespace-pre-wrap text-left text-sm leading-relaxed opacity-90">{b.description}</p>}
        <div className="mt-4 text-xs opacity-70">REWARD</div>
        <div className="text-4xl font-black tracking-tight">{b.pot.toLocaleString()}P</div>
        <div className="mt-3 flex justify-center gap-4 text-xs">
          <span>🙋 {compact(b.participantCount)}명 찾는 중</span>
          <span>🕵️ 발견 {b.foundCount}</span>
          {open ? <Countdown endsAt={b.expiresAt} /> : <b>{b.status === "awarded" ? "🏆 해결됨" : "마감"}</b>}
        </div>
        <div className="mt-3 text-[11px] opacity-70">
          {lv.emoji} 수배자 {b.nickname} · {timeAgo(b.createdAt)}
        </div>
      </section>

      <div className="mt-3 space-y-2 px-3">
        <BountyActions
          bountyId={b.id}
          joined={Boolean(participation)}
          isOwner={isOwner}
          open={open}
          loggedIn={!!user}
          minFund={BOUNTY_POLICY.minFund}
        />
        <ShareButton
          dealId={b.id}
          title={`[수배] ${b.title} — 현상금 ${b.pot.toLocaleString()}P`}
          shareUrl={shareUrl}
          trackPath={`/api/bounties/${b.id}/share`}
          label="📣 수배지 퍼뜨리기"
          rewardText={
            user
              ? "내 링크로 친구가 들어오면 포인트! 이 수배에서 발견된 상품이 팔릴수록 수배자와 헌터, 공유한 사람 모두 포인트를 받아요"
              : "로그인하면 공유로 친구가 들어올 때마다 포인트를 받아요"
          }
        />
      </div>

      <section className="mt-5 px-3">
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 className="font-black">🕵️ 발견된 상품 {subs.length}</h2>
          <span className="text-xs text-sub">유저 평가순</span>
        </div>
        <div className="space-y-2">
          {open && !isOwner && (
            <HuntForm bountyId={b.id} category={b.category} loggedIn={!!user} targetPrice={b.targetPrice} />
          )}
          {subs.map((s, i) => (
            <Submission
              key={s.id}
              rank={i + 1}
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
          {subs.length === 0 && (
            <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-sub">
              아직 발견된 상품이 없어요. 첫 발견자가 되어 현상금을 노려보세요!
            </p>
          )}
        </div>
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-sub">
          채택된 헌터가 현상금(수수료 {BOUNTY_POLICY.platformFeeRate * 100}% 제외)을 받아요. 수배자가 채택하지 않으면 마감 때 순추천{" "}
          {BOUNTY_POLICY.autoAwardMinScore} 이상인 1위 상품이 자동 채택되고, 없으면 현상금은 전액 환불돼요. 발견 상품이 구매로
          이어지면 헌터 {REWARD_POLICY.hunterRate * 100}% · 공유자 {REWARD_POLICY.sharerRate * 100}% · 수배자{" "}
          {REWARD_POLICY.bountyPosterRate * 100}% 비율로 포인트가 계속 쌓여요.
        </p>
      </section>

      <div className="mt-4">
        <Comments
          dealId={b.id}
          initial={comments}
          loggedIn={!!user}
          endpoint={`/api/bounties/${b.id}/comments`}
          nextPath={`/bounties/${b.id}`}
        />
      </div>
      <div className="px-4 pt-4 text-center">
        <Link href="/bounties" className="text-sm text-sub">
          다른 수배 보기 ›
        </Link>
      </div>
    </article>
  );
}
