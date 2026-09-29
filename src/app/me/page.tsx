import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";
import { levelOf } from "@/lib/levels";
import { compact, timeAgo, won } from "@/lib/format";
import { REWARD_POLICY } from "@/lib/rewards";
import { listDeals } from "@/lib/deals";
import { DealCard } from "@/components/DealCard";
import { CheckinButton } from "@/components/CheckinButton";
import { CopyButton } from "@/components/CopyButton";
import { ProfileForm } from "@/components/ProfileForm";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata = { title: "MY" };

const KIND_LABEL: Record<string, string> = {
  share_reward: "공유 수익",
  post_reward: "게시 수익",
  referral_reward: "초대 보너스",
  checkin: "출석 보너스",
  withdraw: "출금",
  admin: "지급",
};

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me");

  const [[stats], ledger, myDeals, [profile]] = await Promise.all([
    sql<{ shareClicks: number; invited: number; dealCount: number; upvotes: number }[]>`
      SELECT
        (SELECT count(*)::int FROM clicks WHERE sharer_id = ${user.id}) AS share_clicks,
        (SELECT count(*)::int FROM users WHERE referred_by = ${user.id}) AS invited,
        (SELECT count(*)::int FROM deals WHERE user_id = ${user.id}) AS deal_count,
        (SELECT COALESCE(sum(votes_up), 0)::int FROM deals WHERE user_id = ${user.id}) AS upvotes`,
    sql<{ id: number; delta: number; kind: string; status: string; memo: string | null; createdAt: Date }[]>`
      SELECT id, delta, kind, status, memo, created_at FROM points_ledger WHERE user_id = ${user.id} ORDER BY id DESC LIMIT 10`,
    listDeals({ sort: "new", userId: user.id, limit: 5 }),
    sql<{ bio: string | null; streakDays: number; lastCheckin: Date | null }[]>`
      SELECT bio, streak_days, last_checkin FROM users WHERE id = ${user.id}`,
  ]);
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
        <div className="text-xs opacity-70">출금 가능 포인트</div>
        <div className="mt-1 text-3xl font-black">{won(user.pointsAvailable)}</div>
        <div className="mt-1 text-xs opacity-70">구매확정 대기 {won(user.pointsPending)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="공유로 유입" value={compact(stats.shareClicks)} />
          <Stat label="올린 딜" value={compact(stats.dealCount)} />
          <Stat label="받은 🔥" value={compact(stats.upvotes)} />
        </div>
        <p className="mt-4 text-[11px] leading-relaxed opacity-70">
          내 공유 링크로 구매 시 수수료의 {REWARD_POLICY.sharerRate * 100}%, 내가 올린 딜 구매 시{" "}
          {REWARD_POLICY.posterRate * 100}%가 적립돼요. {won(REWARD_POLICY.minWithdraw)} 이상 모이면 출금 신청할 수 있어요 (출금 기능 오픈 예정).
        </p>
      </section>

      <section className="mx-3 rounded-2xl bg-surface p-4">
        <h2 className="font-bold">🤝 친구 초대</h2>
        <p className="mt-0.5 text-xs text-sub">
          초대한 친구가 수익을 받을 때마다 친구 수익의 {REWARD_POLICY.referralRate * 100}%를 줍줍이 추가로 드려요
          (친구 몫은 그대로). 지금까지 {stats.invited}명 초대!
        </p>
        <CopyButton text={inviteUrl} label="초대 링크 복사" />
      </section>

      <section className="mx-3 rounded-2xl bg-surface p-4">
        <h2 className="font-bold">📺 내 핫딜 채널</h2>
        <p className="mt-0.5 text-xs text-sub">
          인스타·유튜브·블로그 프로필에 걸어두는 나만의 핫딜 페이지. 모든 링크가 자동으로 수익 링크가 돼요.
        </p>
        {channelUrl && <CopyButton text={channelUrl} label={`${channelUrl.replace(/^https?:\/\//, "")} 복사`} />}
        <ProfileForm handle={user.handle} bio={profile.bio} nickname={user.nickname} />
      </section>

      <section className="mx-3 rounded-2xl bg-surface p-4">
        <h2 className="font-bold">포인트 내역</h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {ledger.map((l) => (
            <li key={l.id} className="flex items-center py-2">
              <div className="flex-1">
                <div>{KIND_LABEL[l.kind] ?? l.kind}</div>
                <div className="text-xs text-sub">
                  {timeAgo(l.createdAt)} · {l.status === "pending" ? "확정 대기" : l.status === "canceled" ? "취소" : "적립"}
                </div>
              </div>
              <span className={`font-bold ${l.status === "canceled" ? "text-sub line-through" : l.delta > 0 ? "text-brand" : ""}`}>
                {l.delta > 0 ? "+" : ""}
                {l.delta.toLocaleString()}P
              </span>
            </li>
          ))}
          {ledger.length === 0 && <li className="py-4 text-center text-xs text-sub">딜을 공유하면 여기에 수익이 쌓여요</li>}
        </ul>
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

      <div className="flex justify-center gap-4 py-4 text-xs text-sub">
        {isAdmin(user.id) && <Link href="/admin">관리자</Link>}
        <LogoutButton />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 py-2">
      <div className="text-lg font-black">{value}</div>
      <div className="text-[11px] opacity-70">{label}</div>
    </div>
  );
}
