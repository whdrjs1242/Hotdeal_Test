import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import { timeAgo } from "@/lib/format";
import { REWARD_POLICY } from "@/lib/rewards";
import { getLook } from "@/lib/cosmetics";
import { decrypt } from "@/lib/crypto";
import { ProfileCard } from "@/components/ProfileCard";
import { CopyButton } from "@/components/CopyButton";
import { ProfileForm } from "@/components/ProfileForm";
import { LogoutButton } from "@/components/LogoutButton";
import { Icon } from "@/components/Icon";
import { Section } from "@/components/ui";

export const metadata = { title: "내 정보" };

const KIND_LABEL: Record<string, string> = {
  hunter_reward: "내가 올린 딜에서 구매",
  post_reward: "내가 올린 딜에서 구매",
  share_reward: "내 공유 링크로 구매",
  bounty_reward: "내 수배 상품 구매",
  bounty_prize: "현상금 받음",
  activity: "활동 포인트",
  referral_reward: "친구 초대 보너스",
  signup_bonus: "가입 축하",
  checkin: "출석 보너스",
  bounty_stake: "수배 현상금",
  bounty_fund: "현상금 보태기",
  bounty_refund: "수배 마감 환불",
  market: "포인트 교환",
  market_refund: "교환 취소",
  game: "최저가 맞히기·무료 상자",
  gacha: "꾸미기 뽑기",
  question: "질문 포인트",
  question_refund: "질문 환불",
  answer_reward: "답변 채택",
  chips: "구슬로 교환",
};

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me");

  const [[stats], ledger, [profile], orders, look, [counts]] = await Promise.all([
    sql<{ arrivals: number; invited: number; dealCount: number; upvotes: number; joined: number }[]>`
      SELECT
        (SELECT count(*)::int FROM share_arrivals WHERE sharer_id = ${user.id}) AS arrivals,
        (SELECT count(*)::int FROM users WHERE referred_by = ${user.id}) AS invited,
        (SELECT count(*)::int FROM deals WHERE user_id = ${user.id}) AS deal_count,
        (SELECT COALESCE(sum(votes_up), 0)::int FROM deals WHERE user_id = ${user.id}) AS upvotes,
        (SELECT count(*)::int FROM bounty_participants WHERE user_id = ${user.id}) AS joined`,
    sql<{ id: number; delta: number; kind: string; status: string; memo: string | null; createdAt: Date }[]>`
      SELECT id, delta, kind, status, memo, created_at FROM points_ledger WHERE user_id = ${user.id} ORDER BY id DESC LIMIT 8`,
    sql<{ bio: string | null }[]>`SELECT bio FROM users WHERE id = ${user.id}`,
    sql<{ id: number; name: string; status: string; deliveryEnc: string | null; createdAt: Date }[]>`
      SELECT o.id, i.name, o.status, o.delivery_enc, o.created_at FROM orders o JOIN shop_items i ON i.id = o.item_id
      WHERE o.user_id = ${user.id} AND i.kind <> 'cosmetic' ORDER BY o.id DESC LIMIT 5`,
    getLook(user.id),
    sql<{ bounties: number; questions: number }[]>`
      SELECT (SELECT count(*)::int FROM bounties WHERE user_id = ${user.id}) AS bounties,
             (SELECT count(*)::int FROM questions WHERE user_id = ${user.id}) AS questions`,
  ]);
  const inviteUrl = `${env.siteUrl}/?r=${user.refCode}`;
  const channelUrl = user.handle ? `${env.siteUrl}/@${user.handle}` : null;

  return (
    <div className="pt-safe space-y-2 pb-6">
      <section className="bg-surface px-5 pb-5 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[22px] font-bold">내 정보</h1>
          <Link href="/alerts" className="flex items-center gap-1 text-[14px] text-sub">
            <Icon name="bell" size={20} /> 알림
          </Link>
        </div>
        <ProfileCard
          nickname={user.nickname}
          xp={user.xp}
          look={look}
          avatarUrl={user.avatarUrl}
          stats={[
            { label: "올린 딜", value: stats.dealCount },
            { label: "받은 추천", value: stats.upvotes },
            { label: "참여 수배", value: stats.joined },
            { label: "공유 방문", value: stats.arrivals },
          ]}
        />
        <Link href="/me/closet" className="mt-2 flex items-center justify-between rounded-xl bg-fill px-4 py-3 text-[14px]">
          <span className="flex items-center gap-2">
            <Icon name="shirt" size={20} className="text-sub" />
            프로필 꾸미기
          </span>
          <Icon name="chevron" size={18} className="text-muted" />
        </Link>
      </section>

      <Section title="포인트" action={{ label: "혜택으로", href: "/points" }}>
        <div className="flex items-end justify-between">
          <div>
            <p className="tnum text-[26px] font-bold">{user.pointsAvailable.toLocaleString()}P</p>
            <p className="text-[13px] text-muted">구매 확정 대기 {user.pointsPending.toLocaleString()}P</p>
          </div>
          <Link href="/market" className="press rounded-lg bg-fill px-3 py-2 text-[13px] font-semibold">
            교환하기
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {ledger.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px]">{KIND_LABEL[l.kind] ?? "포인트"}</p>
                <p className="truncate text-[12px] text-muted">
                  {timeAgo(l.createdAt)}
                  {l.status === "pending" ? " · 구매 확정 대기" : l.status === "canceled" ? " · 취소됨" : ""}
                </p>
              </div>
              <span className={`tnum text-[15px] font-semibold ${l.status === "canceled" ? "text-muted line-through" : l.delta > 0 ? "text-positive" : ""}`}>
                {l.delta > 0 ? "+" : ""}
                {l.delta.toLocaleString()}P
              </span>
            </li>
          ))}
          {ledger.length === 0 && <li className="py-4 text-[14px] text-muted">아직 포인트 내역이 없어요.</li>}
        </ul>
        {orders.length > 0 && (
          <>
            <p className="mt-4 text-[14px] font-semibold">교환 내역</p>
            <ul className="mt-1 divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-3 text-[14px]">
                  <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  {o.status === "fulfilled" && o.deliveryEnc ? (
                    <span className="tnum select-all font-semibold">{decrypt(o.deliveryEnc)}</span>
                  ) : (
                    <span className="text-muted">{o.status === "requested" ? "발송 준비 중" : o.status === "canceled" ? "취소·환불" : "발송 완료"}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title="내 활동">
        <ul className="-my-1 divide-y divide-line">
          <MenuLink href="/me/deals" label="올린 핫딜" count={stats.dealCount} />
          <MenuLink href="/me/bounties" label="내 수배" count={counts.bounties} />
          <MenuLink href="/questions?mine=1" label="내 질문" count={counts.questions} />
          <MenuLink href="/rank" label="이번 주 랭킹" />
        </ul>
      </Section>

      <Section title="친구 초대" desc={`친구가 받은 구매 포인트의 ${REWARD_POLICY.referralRate * 100}%를 줍줍이 추가로 드려요 (친구 몫은 그대로)`}>
        <p className="text-[14px] text-sub">지금까지 {stats.invited}명을 초대했어요.</p>
        <CopyButton text={inviteUrl} label="초대 링크 복사" />
      </Section>

      <Section title="내 핫딜 채널" desc="블로그·인스타그램 프로필에 걸어둘 수 있는 내 딜 모음 페이지">
        {channelUrl && <CopyButton text={channelUrl} label={`${channelUrl.replace(/^https?:\/\//, "")} 복사`} />}
        <ProfileForm handle={user.handle} bio={profile.bio} nickname={user.nickname} />
      </Section>

      <div className="flex justify-center gap-5 py-4 text-[13px] text-muted">
        {isAdmin(user.id) && <Link href="/admin">운영 대시보드</Link>}
        <LogoutButton />
      </div>
    </div>
  );
}

function MenuLink({ href, label, count, disabled }: { href: string; label: string; count?: number; disabled?: boolean }) {
  const inner = (
    <>
      <span className="flex-1 text-[15px]">{label}</span>
      {count != null && <span className="tnum text-[14px] text-muted">{count}</span>}
      {!disabled && <Icon name="chevron" size={18} className="text-muted" />}
    </>
  );
  return (
    <li>
      {disabled ? (
        <div className="flex items-center gap-2 py-3">{inner}</div>
      ) : (
        <Link href={href} className="flex items-center gap-2 py-3">
          {inner}
        </Link>
      )}
    </li>
  );
}
