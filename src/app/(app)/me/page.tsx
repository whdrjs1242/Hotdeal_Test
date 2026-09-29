import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import { levelOf } from "@/lib/levels";
import { compact, timeAgo, won } from "@/lib/format";
import { CASHOUT, REWARD_POLICY } from "@/lib/rewards";
import { listDeals } from "@/lib/deals";
import { listBounties } from "@/lib/bounties";
import { DealCard } from "@/components/DealCard";
import { BountyCard } from "@/components/BountyCard";
import { CheckinButton } from "@/components/CheckinButton";
import { CopyButton } from "@/components/CopyButton";
import { ProfileForm } from "@/components/ProfileForm";
import { LogoutButton } from "@/components/LogoutButton";
import { CashoutForm } from "@/components/CashoutForm";

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
  withdraw: "💸 현금화 신청",
  withdraw_refund: "↩️ 현금화 반려",
  post_reward: "🕵️ 내가 찾은 딜 구매",
  admin: "지급",
};

/** 역할별 누적 적립 (차감·환불 제외) */
const ROLE_KINDS = {
  hunter: ["hunter_reward", "bounty_prize", "post_reward"],
  poster: ["bounty_reward"],
  participant: ["activity", "share_reward"],
} as const;

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me");

  const [[stats], ledger, myDeals, myBounties, [profile], byKind, withdrawals] = await Promise.all([
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
    sql<{ id: number; points: number; amountKrw: number; status: string; createdAt: Date }[]>`
      SELECT id, points, amount_krw, status, created_at FROM withdrawals WHERE user_id = ${user.id} ORDER BY id DESC LIMIT 5`,
  ]);
  const total = (kinds: readonly string[]) => byKind.filter((k) => kinds.includes(k.kind)).reduce((a, k) => a + k.total, 0);
  const roles = [
    { label: "헌터", emoji: "🕵️", value: total(ROLE_KINDS.hunter), hint: "찾은 상품 구매 · 현상금" },
    { label: "수배자", emoji: "🎯", value: total(ROLE_KINDS.poster), hint: "내 수배 상품 구매" },
    { label: "참여자", emoji: "🙋", value: total(ROLE_KINDS.participant), hint: "참여 · 공유 · 평가" },
  ];
  const lv = levelOf(user.xp);
  const inviteUrl = `${env.siteUrl}/?r=${user.refCode}`;
  const channelUrl = user.handle ? `${env.siteUrl}/@${user.handle}` : null;

  return (
    <div className="pt-safe space-y-2 pb-6">
      <section className="bg-surface px-4 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-3xl">{lv.emoji}</div>
          <div className="flex-1">
            <div className="text-lg font-black">{user.nickname}</div>
            <div className="text-xs text-sub">
              Lv.{lv.level} {lv.name} · {compact(user.xp)} XP
            </div>
          </div>
          <CheckinButton streak={profile.streakDays} />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-brand" style={{ width: `${lv.progress * 100}%` }} />
        </div>
        {lv.next && (
          <p className="mt-1 text-right text-[11px] text-sub">
            {lv.next.emoji} {lv.next.name}까지 {compact(lv.next.min - user.xp)} XP
          </p>
        )}
      </section>

      <section className="mx-3 rounded-2xl bg-gradient-to-br from-ink to-[#2d3340] p-5 text-white">
        <div className="text-xs opacity-70">내 포인트</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-black">{user.pointsAvailable.toLocaleString()}P</span>
          <span className="text-sm opacity-70">≈ {won(Math.floor(user.pointsAvailable * CASHOUT.rate))}</span>
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
        <CashoutForm balance={user.pointsAvailable} min={CASHOUT.minPoints} rate={CASHOUT.rate} />
        {withdrawals.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs opacity-80">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex justify-between">
                <span>
                  {timeAgo(w.createdAt)} · {w.points.toLocaleString()}P → {won(w.amountKrw)}
                </span>
                <b>{w.status === "requested" ? "처리 중" : w.status === "paid" ? "입금 완료" : "반려"}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mx-3 grid grid-cols-4 gap-2 rounded-2xl bg-surface p-3 text-center text-xs">
        <Mini label="올린 딜" value={stats.dealCount} />
        <Mini label="받은 🔥" value={stats.upvotes} />
        <Mini label="참여 수배" value={stats.joined} />
        <Mini label="공유 유입" value={stats.arrivals} />
      </section>

      <section className="mx-3 rounded-2xl bg-surface p-4">
        <h2 className="font-bold">🤝 친구 초대</h2>
        <p className="mt-0.5 text-xs text-sub">
          친구가 가입하면 가입 축하 포인트를 받고, 친구가 포인트를 모을 때마다 친구 몫의 {REWARD_POLICY.referralRate * 100}%를
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
