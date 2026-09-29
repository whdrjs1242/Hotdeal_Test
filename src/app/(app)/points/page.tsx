import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ACTIVITY_POINTS, BOUNTY_POLICY, DAILY_ACTIVITY_CAP, QUESTION_POLICY, REWARD_POLICY } from "@/lib/rewards";
import { GAME_POLICY, luckyOpenedToday } from "@/lib/games";
import { CAPSULE, PLAY, playState, SCRATCH, UPDOWN } from "@/lib/play";
import { listShopItems } from "@/lib/market";
import { Icon } from "@/components/Icon";
import { Section, Row, buttonClass } from "@/components/ui";
import { LuckyBoxButton, GachaButton } from "@/components/Games";
import { CheckinButton } from "@/components/CheckinButton";
import { MarbleWallet, MarbleShopItem } from "@/components/play/Wallet";

export const metadata = { title: "혜택" };

const todayStart = sql`(date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`;

export default async function PointsPage() {
  const user = await getCurrentUser();
  const [opened, today, items, play, quiz, profile, shop] = await Promise.all([
    user ? luckyOpenedToday(user.id) : false,
    user
      ? sql<{ earned: number; activity: number }[]>`
          SELECT COALESCE(sum(delta) FILTER (WHERE delta > 0 AND kind NOT LIKE '%refund' AND kind <> 'admin'), 0)::int AS earned,
                 COALESCE(sum(delta) FILTER (WHERE kind = 'activity'), 0)::int AS activity
          FROM points_ledger WHERE user_id = ${user.id} AND status <> 'canceled' AND created_at >= ${todayStart}`.then((r) => r[0])
      : { earned: 0, activity: 0 },
    listShopItems(),
    user ? playState(user.id) : null,
    user
      ? sql<{ idx: number; finished: boolean }[]>`
          SELECT (state->>'idx')::int AS idx, (state->>'finished')::boolean AS finished FROM game_plays
          WHERE user_id = ${user.id} AND game = 'price_quiz' AND day = (now() AT TIME ZONE 'Asia/Seoul')::date`.then((r) => r[0])
      : undefined,
    user
      ? sql<{ streakDays: number; checked: boolean }[]>`
          SELECT streak_days, COALESCE(last_checkin = (now() AT TIME ZONE 'Asia/Seoul')::date, false) AS checked
          FROM users WHERE id = ${user.id}`.then((r) => r[0])
      : undefined,
    sql<{ id: number; name: string; image: string; slot: string; priceChips: number; owned: boolean }[]>`
      SELECT i.id, i.name, i.image, i.slot, i.price_chips,
             ${user ? sql`EXISTS (SELECT 1 FROM user_items ui WHERE ui.user_id = ${user.id} AND ui.item_id = i.id)` : sql`false`} AS owned
      FROM shop_items i WHERE i.active AND i.price_chips IS NOT NULL ORDER BY i.price_chips`,
  ]);
  const exchange = items.filter((i) => i.kind !== "cosmetic").slice(0, 4);
  const quizDone = quiz?.finished ?? false;

  return (
    <div className="pt-safe space-y-2">
      <header className="bg-surface px-5 pb-5 pt-6">
        <h1 className="text-[22px] font-bold">혜택</h1>
        {user ? (
          <>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-[13px] text-sub">사용할 수 있는 포인트</p>
                <p className="tnum text-[30px] font-bold leading-tight">{user.pointsAvailable.toLocaleString()}P</p>
              </div>
              <Link href="/market" className={buttonClass("secondary", "sm")}>
                교환하기
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
              <div className="rounded-xl bg-fill px-3 py-2.5">
                <p className="text-muted">오늘 받은 포인트</p>
                <p className="tnum text-[15px] font-semibold">+{today.earned.toLocaleString()}P</p>
              </div>
              <div className="rounded-xl bg-fill px-3 py-2.5">
                <p className="text-muted">구매 확정 대기</p>
                <p className="tnum text-[15px] font-semibold">{user.pointsPending.toLocaleString()}P</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[12px] text-muted">
                <span>오늘 활동 포인트</span>
                <span className="tnum">
                  {today.activity} / {DAILY_ACTIVITY_CAP}P
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-fill">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (today.activity / DAILY_ACTIVITY_CAP) * 100)}%` }} />
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-2xl bg-fill p-4">
            <p className="text-[15px] font-semibold">가입하면 1,000P를 드려요</p>
            <p className="mt-1 text-[13px] text-sub">글·댓글·수배 참여로 포인트를 모아 상품권으로 바꿀 수 있어요.</p>
            <Link href="/login?next=/points" className={`${buttonClass("primary", "md", true)} mt-3`}>
              시작하기
            </Link>
          </div>
        )}
      </header>

      {user && (
        <Section title="오늘 할 일">
          <ul className="divide-y divide-line">
            <Todo icon="calendar" title="출석 체크" desc={`${profile?.streakDays ?? 0}일 연속 · 7일마다 50P`}>
              <CheckinButton streak={profile?.streakDays ?? 0} checked={profile?.checked ?? false} />
            </Todo>
            <Todo icon="question" title="최저가 맞히기" desc={`정답마다 ${GAME_POLICY.quiz.perCorrect}P · 다 맞히면 +${GAME_POLICY.quiz.perfectBonus}P`}>
              {quizDone ? (
                <span className="text-[13px] font-semibold text-positive">완료</span>
              ) : (
                <Link href="/games/quiz" className="press flex h-8 items-center rounded-lg bg-brand px-3 text-[13px] font-semibold text-white">
                  {quiz ? `${quiz.idx}/${GAME_POLICY.quiz.rounds} 이어하기` : "풀기"}
                </Link>
              )}
            </Todo>
            <Todo icon="gift" title="무료 상자" desc="하루 한 번 5~500P">
              <LuckyBoxButton opened={opened} loggedIn />
            </Todo>
          </ul>
        </Section>
      )}

      <Section title="놀이터" desc="구슬로 즐기는 미니게임">
        {play && user ? (
          <MarbleWallet marbles={play.marbles} canClaim={play.canClaim} claimKind={play.claimKind} points={user.pointsAvailable} convert={PLAY.convert} />
        ) : (
          <p className="rounded-2xl bg-fill p-4 text-[14px] text-sub">로그인하면 매일 구슬 {PLAY.daily.toLocaleString()}개를 받을 수 있어요.</p>
        )}
        <ul className="mt-2 divide-y divide-line">
          <GameRow href="/play/updown" title="가격 업다운" desc={`다음 상품이 더 비쌀까? 맞힐수록 판돈이 불어나요 · ${UPDOWN.minBet}개부터`} />
          <GameRow href="/play/capsule" title="뽑기 캡슐" desc={`최대 구슬 5,000개 · 1번 ${CAPSULE.cost}개`} />
          <GameRow href="/play/scratch" title="긁는 쿠폰" desc={`같은 금액 3칸이면 당첨 · 최대 10,000개 · 1장 ${SCRATCH.cost}개`} />
        </ul>
        {shop.length > 0 && (
          <>
            <p className="mt-4 text-[14px] font-semibold">구슬로 꾸미기</p>
            <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
              {shop.map((i) => (
                <MarbleShopItem key={i.id} id={i.id} name={i.name} image={i.image} slot={i.slot} price={Number(i.priceChips)} owned={i.owned} />
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="포인트 교환" action={{ label: "전체 보기", href: "/market" }}>
        <div className="grid grid-cols-2 gap-2">
          {exchange.map((i) => (
            <Link key={i.id} href={`/market#item-${i.id}`} className="press rounded-xl bg-fill p-3">
              <p className="line-clamp-2 min-h-10 text-[14px] leading-5">{i.name}</p>
              <p className="tnum mt-1 text-[15px] font-bold">{i.pricePoints?.toLocaleString()}P</p>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-fill px-4 py-3">
          <div>
            <p className="text-[14px] font-semibold">꾸미기 뽑기</p>
            <p className="text-[12px] text-muted">아직 없는 캐릭터·카드·칭호 중 하나</p>
          </div>
          <GachaButton cost={GAME_POLICY.gacha.cost} loggedIn={!!user} balance={user?.pointsAvailable ?? 0} />
        </div>
      </Section>

      <Section title="포인트 받는 방법">
        <div className="divide-y divide-line">
          <Row label="핫딜 글 작성" value={`${ACTIVITY_POINTS.post}P`} />
          <Row label="댓글 · 추천" value={`${ACTIVITY_POINTS.comment}P · ${ACTIVITY_POINTS.vote}P`} />
          <Row label="수배 참여 · 상품 발견 등록" value={`${ACTIVITY_POINTS.join}P · ${ACTIVITY_POINTS.hunt}P`} />
          <Row label="질문 답변" value={`${ACTIVITY_POINTS.answer}P`} sub="채택되면 질문에 걸린 포인트 전부" />
          <Row label="공유한 링크로 방문" value={`${ACTIVITY_POINTS.shareArrival}P`} />
          <Row label="내가 올린 딜에서 구매 발생" value={`수수료의 ${REWARD_POLICY.hunterRate * 100}%`} />
          <Row label="내 공유로 구매 · 내 수배에서 구매" value={`${REWARD_POLICY.sharerRate * 100}% · ${REWARD_POLICY.bountyPosterRate * 100}%`} />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          활동 포인트는 하루 {DAILY_ACTIVITY_CAP}P까지 받을 수 있어요. 구매로 생긴 포인트는 제한이 없고, 판매처의 구매 확정 후 사용할 수 있어요. 수배는{" "}
          {BOUNTY_POLICY.minStake}P, 질문은 {QUESTION_POLICY.minReward}P부터 걸 수 있어요.
        </p>
        <Link href="/rank" className="mt-3 flex items-center justify-between rounded-xl bg-fill px-4 py-3 text-[14px]">
          이번 주 랭킹 보기
          <Icon name="chevron" size={18} className="text-muted" />
        </Link>
      </Section>
    </div>
  );
}

function Todo({ icon, title, desc, children }: { icon: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fill text-sub">
        <Icon name={icon} size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="truncate text-[12px] text-muted">{desc}</p>
      </div>
      {children}
    </li>
  );
}

function GameRow({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fill text-sub">
          <Icon name="game" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{title}</p>
          <p className="truncate text-[12px] text-muted">{desc}</p>
        </div>
        <Icon name="chevron" size={18} className="text-muted" />
      </Link>
    </li>
  );
}
