import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ACTIVITY_POINTS, BOUNTY_POLICY, DAILY_ACTIVITY_CAP, REWARD_POLICY, QUESTION_POLICY } from "@/lib/rewards";
import { GAME_POLICY, luckyOpenedToday } from "@/lib/games";
import { listShopItems } from "@/lib/market";
import { LuckyBox, Gacha } from "@/components/Games";

export const metadata = { title: "포인트" };

const pct = (w: number, total: number) => `${((w / total) * 100).toFixed(w / total < 0.01 ? 1 : 0)}%`;

export default async function PointsPage() {
  const user = await getCurrentUser();
  const [opened, today, items] = await Promise.all([
    user ? luckyOpenedToday(user.id) : false,
    user
      ? sql<{ earned: number; activity: number }[]>`
          SELECT COALESCE(sum(delta) FILTER (WHERE delta > 0 AND kind NOT LIKE '%refund' AND kind <> 'admin'), 0)::int AS earned,
                 COALESCE(sum(delta) FILTER (WHERE kind = 'activity'), 0)::int AS activity
          FROM points_ledger WHERE user_id = ${user.id} AND status <> 'canceled'
            AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`.then((r) => r[0])
      : { earned: 0, activity: 0 },
    listShopItems(),
  ]);
  const luckyTotal = GAME_POLICY.lucky.reduce((a, l) => a + l.weight, 0);
  const gachaTotal = Object.values(GAME_POLICY.gacha.weights).reduce((a, b) => a + b, 0);
  const giftcards = items.filter((i) => i.kind !== "cosmetic").slice(0, 6);

  return (
    <div className="pt-safe space-y-3 pb-6">
      <header className="bg-gradient-to-br from-brand to-[#ff2e55] px-4 pb-6 pt-6 text-white">
        <div className="text-sm opacity-90">내 포인트</div>
        <div className="text-4xl font-black">{(user?.pointsAvailable ?? 0).toLocaleString()}P</div>
        {user ? (
          <>
            <div className="mt-1 text-xs opacity-90">
              오늘 +{today.earned.toLocaleString()}P · 구매 확정 대기 {user.pointsPending.toLocaleString()}P
            </div>
            <div className="mt-3 text-[11px] opacity-90">
              오늘 활동 포인트 {today.activity}/{DAILY_ACTIVITY_CAP}P
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (today.activity / DAILY_ACTIVITY_CAP) * 100)}%` }} />
            </div>
          </>
        ) : (
          <Link href="/login?next=/points" className="mt-3 inline-block rounded-xl bg-white px-4 py-2 text-sm font-bold text-brand">
            가입하고 1,000P 받기
          </Link>
        )}
      </header>

      <section className="space-y-2 px-3">
        <h2 className="px-1 font-black">🎮 오늘의 게임</h2>
        <Link href="/games/quiz" className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <div className="text-5xl">🏷️</div>
          <div className="flex-1">
            <div className="font-black">최저가 맞히기</div>
            <div className="text-xs text-sub">
              진짜 핫딜 가격을 맞혀보세요. 하루 {GAME_POLICY.quiz.rounds}문제 · 정답당 {GAME_POLICY.quiz.perCorrect}P · 전부 맞히면 +
              {GAME_POLICY.quiz.perfectBonus}P
            </div>
          </div>
          <span className="text-sub">›</span>
        </Link>
        <LuckyBox
          opened={opened}
          loggedIn={!!user}
          odds={GAME_POLICY.lucky.map((l) => ({ points: l.points, pct: pct(l.weight, luckyTotal) }))}
        />
        <Gacha
          cost={GAME_POLICY.gacha.cost}
          loggedIn={!!user}
          balance={user?.pointsAvailable ?? 0}
          odds={Object.entries(GAME_POLICY.gacha.weights).map(([k, w]) => ({
            label: { common: "일반", rare: "레어", epic: "에픽", legendary: "전설" }[k] ?? k,
            pct: pct(w, gachaTotal),
          }))}
        />
      </section>

      <section className="px-3">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="font-black">🛍️ 포인트 마켓</h2>
          <Link href="/market" className="text-xs text-sub">
            전체 ›
          </Link>
        </div>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {giftcards.map((i) => (
            <Link key={i.id} href={`/market#item-${i.id}`} className="w-32 shrink-0 rounded-2xl bg-surface p-3 ring-1 ring-line">
              <div className="flex h-14 items-center justify-center text-4xl">{i.image}</div>
              <div className="mt-1 line-clamp-2 h-8 text-xs font-semibold leading-4">{i.name}</div>
              <div className="mt-1 text-sm font-black text-brand">{i.pricePoints?.toLocaleString()}P</div>
            </Link>
          ))}
          <Link href="/market?tab=cosmetic" className="flex w-28 shrink-0 flex-col items-center justify-center rounded-2xl bg-surface text-center text-xs ring-1 ring-line">
            <span className="text-3xl">🦊</span>꾸미기
            <br />
            상점
          </Link>
        </div>
      </section>

      <section className="mx-3 rounded-2xl bg-surface p-4">
        <h2 className="font-black">💡 포인트 버는 법</h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          <Row k="핫딜 공유 글 작성" v={`+${ACTIVITY_POINTS.post}P`} />
          <Row k="댓글 · 추천/평가" v={`+${ACTIVITY_POINTS.comment}P · +${ACTIVITY_POINTS.vote}P`} />
          <Row k="수배 참여 · 발견 상품 등록" v={`+${ACTIVITY_POINTS.join}P · +${ACTIVITY_POINTS.hunt}P`} />
          <Row k="질문에 답변" v={`+${ACTIVITY_POINTS.answer}P (채택 시 질문 포인트 전부)`} />
          <Row k="내 공유 링크로 친구 방문" v={`+${ACTIVITY_POINTS.shareArrival}P`} />
          <Row k="내가 찾은 딜로 구매 발생" v={`구매 기여 ${REWARD_POLICY.hunterRate * 100}%`} />
          <Row k="내 공유로 구매 · 내 수배 상품 구매" v={`${REWARD_POLICY.sharerRate * 100}% · ${REWARD_POLICY.bountyPosterRate * 100}%`} />
          <Row k="수배 현상금 채택" v="현상금의 90%" />
        </ul>
        <p className="mt-2 text-[11px] text-sub">활동 포인트는 하루 {DAILY_ACTIVITY_CAP}P까지, 구매 기여 포인트는 제한 없이 쌓여요.</p>
        <h3 className="mt-4 font-black">포인트 쓰는 곳</h3>
        <ul className="mt-2 divide-y divide-line text-sm">
          <Row k="수배지 걸기" v={`${BOUNTY_POLICY.minStake}P~`} />
          <Row k="질문하기" v={`${QUESTION_POLICY.minReward}P~`} />
          <Row k="꾸미기 뽑기 · 상점" v={`${GAME_POLICY.gacha.cost}P~`} />
          <Row k="상품권 · 제휴 상품 교환" v="마켓" />
        </ul>
        <Link href="/rank" className="mt-4 block rounded-xl bg-canvas py-2.5 text-center text-sm font-bold">
          🏆 헌터 랭킹 보기
        </Link>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex justify-between gap-3 py-2">
      <span className="text-sub">{k}</span>
      <b className="text-right">{v}</b>
    </li>
  );
}
