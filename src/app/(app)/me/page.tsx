import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import { levelOf } from "@/lib/levels";
import { compact, timeAgo, won } from "@/lib/format";
import { REWARD_POLICY } from "@/lib/rewards";
import { getLook } from "@/lib/cosmetics";
import { decrypt } from "@/lib/crypto";
import { ProfileCard } from "@/components/ProfileCard";
import { listDeals } from "@/lib/deals";
import { listBounties } from "@/lib/bounties";
import { DealCard } from "@/components/DealCard";
import { BountyCard } from "@/components/BountyCard";
import { CheckinButton } from "@/components/CheckinButton";
import { CopyButton } from "@/components/CopyButton";
import { ProfileForm } from "@/components/ProfileForm";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata = { title: "MY" };

const KIND_LABEL: Record<string, string> = {
  hunter_reward: "🕵️ 내가 찾은 딜 구매",
  share_reward: "📣 내 공유로 구매",
  bounty_reward: "🎯 내 수배 상품 구매",
  bounty_prize: "🏆 현상금 획득",
  activity: "🙋 참여 활동",
  referral_reward: "🤝 초대 보너스",
  signup_bonus: "🎁 가입 축하",
  checkin: "📅 출석 보너스",
  bounty_stake: "🎯 수배지 현상금",
  bounty_fund: "💰 현상금 올리기",
  bounty_refund: "↩️ 수배 마감 환불",
  market: "🛍️ 마켓 교환",
  market_refund: "↩️ 마켓 교환 취소",
  game: "🎮 게임",
  gacha: "🎰 꾸미기 뽑기",
  question: "💬 질문 포인트",
  question_refund: "↩️ 질문 환불",
  answer_reward: "🏅 답변 채택",
  post_reward: "🕵️ 내가 찾은 딜 구매",
  admin: "지급",
};

/** 역할별 누적 적립 (차감·환불 제외) */
const ROLE_KINDS = {
  hunter: ["hunter_reward", "bounty_prize", "post_reward"],
  poster: ["bounty_reward"],
  participant: ["activity", "share_reward", "answer_reward", "game"],
} as const;

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me");

  const [[stats], ledger, myDeals, myBounties, [profile], byKind, orders, look] = await Promise.all([
    sql<{ arrivals: number; invited: number; dealCount: number; upvotes: number; joined: number }[]>`
      SELECT
        (SELECT count(*)::int FROM share_arrivals WHERE sharer_id = ${user.id}) AS arrivals,
        (SELECT count(*)::int FROM users WHERE referred_by = ${user.id}) AS invited,
        (SELECT count(*)::int FROM deals WHERE user_id = ${user.id}) AS deal_count,
        (SELECT COALESCE(sum(votes_up), 0)::int FROM deals WHERE user_id = ${user.id}) AS upvotes,
        (SELECT count(*)::int FROM bounty_participants WHERE user_id = ${user.id}) AS joined`,
    sql<{ id: number; delta: number; kind: string; status: string; memo: string | null; createdAt: Date }[]>`
      SELECT id, delta, kind, status, memo, created_at FROM points_ledger WHERE user_id = ${user.id} ORDER BY id DESC LIMIT 15`,
    listDeals({ sort: "new", userId: user.id, limit: 5 }),
    listBounties({ sort: "new", userId: user.id, limit: 5 }),
    sql<{ bio: string | null; streakDays: number }[]>`SELECT bio, streak_days FROM users WHERE id = ${user.id}`,
    sql<{ kind: string; total: number }[]>`
      SELECT kind, COALESCE(sum(delta), 0)::int AS total FROM points_ledger
      WHERE user_id = ${user.id} AND status <> 'canceled' AND delta > 0 GROUP BY kind`,
    sql<{ id: number; name: string; image: string | null; status: string; deliveryEnc: string | null; createdAt: Date }[]>`
      SELECT o.id, i.name, i.image, o.status, o.delivery_enc, o.created_at FROM orders o JOIN shop_items i ON i.id = o.item_id
      WHERE o.user_id = ${user.id} AND i.kind <> 'cosmetic' ORDER BY o.id DESC LIMIT 5`,
    getLook(user.id),
  ]);
  const total = (kinds: readonly string[]) => byKind.filter((k) => kinds.includes(k.kind)).reduce((a, k) => a + k.total, 0);
  const roles = [
    { label: "헌터", emoji: "🕵️", value: total(ROLE_KINDS.hunter), hint: "찾은 상품 구매 · 현상금" },
    { label: "수배자", emoji: "🎯", value: total(ROLE_KINDS.poster), hint: "내 수배 상품 구매" },
    { label: "참여자", emoji: "🙋", value: total(ROLE_KINDS.participant), hint: "참여 · 답변 · 게임" },
  ];
  const lv = levelOf(user.xp);
  const inviteUrl = `${env.siteUrl}/?r=${user.refCode}`;
  const channelUrl = user.handle ? `${env.siteUrl}/@${user.handle}` : null;

  return (
    <div className="pt-safe space-y-2 pb-6">
      <section className="px-3 pt-4">
        <ProfileCard
          nickname={user.nickname}
          xp={user.xp}
          look={look}
          avatarUrl={user.avatarUrl}
          stats={[
            { label: "올린 딜", value: stats.dealCount },
            { label: "받은 🔥", value: stats.upvotes },
            { label: "참여 수배", value: stats.joined },
            { label: "공유 유입", value: stats.arrivals },
          ]}
        />
        <div className="mt-2 flex gap-2">
          <Link href="/me/closet" className="flex-1 rounded-xl bg-surface py-2.5 text-center text-sm font-bold ring-1 ring-line">
            👕 꾸미기
          </Link>
          <CheckinButton streak={profile.streakDays} />
        </div>
      </section>

      <section className="mx-3 rounded-2xl bg-gradient-to-br from-ink to-[#2d3340] p-5 text-white">
        <div className="text-xs opacity-70">내 포인트</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-black">{user.pointsAvailable.toLocaleString()}P</span>
        </div>
        <div className="mt-1 text-xs opacity-70">구매 확정 대기 {user.pointsPending.toLocaleString()}P</div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {roles.map((r) => (
            <div key={r.label} className="rounded-xl bg-white/10 px-1 py-2">
              <div className="text-[11px] opacity-70">
                {r.emoji} {r.label}
              </div>
              <div className="text-lg font-black">{compact(r.value)}P</div>
              <div className="truncate text-[10px] opacity-60">{r.hint}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/market" className="rounded-xl bg-white py-2.5 text-center text-sm font-bold text-ink">
            🛍️ 포인트 마켓
          </Link>
          <Link href="/points" className="rounded-xl bg-white/15 py-2.5 text-center text-sm font-bold">
            🎮 게임 · 버는 법
          </Link>
        </div>
        {orders.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-xs">
            <li className="opacity-70">교환 내역</li>
            {orders.map((o) => (
              <li key={o.id} className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-2">
                <span>{o.image?.startsWith("http") ? "🎁" : o.image}</span>
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                {o.status === "fulfilled" && o.deliveryEnc ? (
                  <b className="select-all">{decrypt(o.deliveryEnc)}</b>
                ) : (
                  <b>{o.status === "requested" ? "발송 준비 중" : o.status === "canceled" ? "취소(환불)" : "발송 완료"}</b>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>


      <section className="mx-3 rounded-2xl bg-surface p-4">
        <h2 className="font-bold">🤝 친구 초대</h2>
        <p className="mt-0.5 text-xs text-sub">
          친구가 가입하면 가입 축하 포인트를 받고, 친구가 구매 기여 포인트를 모을 때마다 친구 몫의 {REWARD_POLICY.referralRate * 100}%를
          줍줍이 내게 추가로 드려요. 지금까지 {stats.invited}명 초대!
        </p>
        <CopyButton text={inviteUrl} label="초대 링크 복사" />
      </section>

      <section className="mx-3 rounded-2xl bg-surface p-4">
        <h2 className="font-bold">포인트 내역</h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {ledger.map((l) => (
            <li key={l.id} className="flex items-center py-2">
              <div className="min-w-0 flex-1">
                <div>{KIND_LABEL[l.kind] ?? l.kind}</div>
                <div className="truncate text-xs text-sub">
                  {timeAgo(l.createdAt)} · {l.status === "pending" ? "확정 대기" : l.status === "canceled" ? "취소" : l.memo ?? "적립"}
                </div>
              </div>
              <span className={`font-bold ${l.status === "canceled" ? "text-sub line-through" : l.delta > 0 ? "text-brand" : ""}`}>
                {l.delta > 0 ? "+" : ""}
                {l.delta.toLocaleString()}P
              </span>
            </li>
          ))}
          {ledger.length === 0 && <li className="py-4 text-center text-xs text-sub">수배에 참여하거나 딜을 공유해 포인트를 모아보세요</li>}
        </ul>
      </section>

      <section className="mx-3 space-y-2">
        <div className="flex items-baseline justify-between px-1 pt-2">
          <h2 className="font-bold">내 수배지</h2>
          <Link href="/bounties/new" className="text-xs text-sub">
            + 수배지 걸기
          </Link>
        </div>
        {myBounties.items.map((b) => (
          <BountyCard key={b.id} bounty={b} />
        ))}
        {myBounties.items.length === 0 && <p className="rounded-2xl bg-surface py-5 text-center text-xs text-sub">아직 건 수배지가 없어요</p>}
      </section>

      <section className="bg-surface">
        <h2 className="px-4 pt-4 font-bold">내가 올린 딜</h2>
        <div className="divide-y divide-line">
          {myDeals.items.map((d) => (
            <DealCard key={d.id} deal={d} />
          ))}
          {myDeals.items.length === 0 && (
            <Link href="/submit" className="block px-4 py-6 text-center text-sm text-sub">
              첫 핫딜을 올려보세요 →
            </Link>
          )}
        </div>
      </section>

      <section className="mx-3 rounded-2xl bg-surface p-4">
        <h2 className="font-bold">📺 내 핫딜 채널</h2>
        <p className="mt-0.5 text-xs text-sub">인스타·유튜브·블로그 프로필에 걸어두는 나만의 핫딜 모음 페이지</p>
        {channelUrl && <CopyButton text={channelUrl} label={`${channelUrl.replace(/^https?:\/\//, "")} 복사`} />}
        <ProfileForm handle={user.handle} bio={profile.bio} nickname={user.nickname} />
      </section>

      <div className="flex justify-center gap-4 py-4 text-xs text-sub">
        <Link href="/alerts">알림 설정</Link>
        {isAdmin(user.id) && <Link href="/admin">관리자</Link>}
        <LogoutButton />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-base font-black">{compact(value)}</div>
      <div className="text-sub">{label}</div>
    </div>
  );
}
