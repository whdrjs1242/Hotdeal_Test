import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { CASINO, casinoState, recentBigWins, slotRtp, weeklyChipRanking } from "@/lib/casino";
import { cached } from "@/lib/cache";
import { ChipWallet, ChipShopItem } from "@/components/casino/LoungeActions";

export const metadata = { title: "줍줍 라운지" };

const GAME_NAME: Record<string, string> = { slot: "슬롯", roulette: "룰렛", rocket: "로켓" };
const GAMES = [
  { href: "/casino/slot", icon: "🎰", name: "줍줍 슬롯", desc: "🐥🐥🐥 잭팟 3,000배", bg: "from-[#ff6fb5] to-[#9b5cff]" },
  { href: "/casino/roulette", icon: "🎡", name: "러키 룰렛", desc: "숫자 맞히면 36배", bg: "from-[#ff8a5c] to-[#ff4f6d]" },
  { href: "/casino/rocket", icon: "🚀", name: "로켓 탈출", desc: "터지기 전에 탈출! 최대 100배", bg: "from-[#4fd1a5] to-[#3b82f6]" },
];

export default async function LoungePage() {
  const user = await getCurrentUser();
  const [state, wins, ranking, shop] = await Promise.all([
    user ? casinoState(user.id) : null,
    cached("casino:wins", 15, () => recentBigWins()),
    cached("casino:rank", 60, () => weeklyChipRanking()),
    sql<{ id: number; name: string; image: string; slot: string; rarity: string; priceChips: number; owned: boolean }[]>`
      SELECT i.id, i.name, i.image, i.slot, i.rarity, i.price_chips,
             ${user ? sql`EXISTS (SELECT 1 FROM user_items ui WHERE ui.user_id = ${user.id} AND ui.item_id = i.id)` : sql`false`} AS owned
      FROM shop_items i WHERE i.active AND i.price_chips IS NOT NULL ORDER BY i.price_chips`,
  ]);

  return (
    <div className="lounge pt-safe min-h-dvh pb-10">
      <header className="px-4 pt-6 text-center">
        <div className="text-5xl floaty">🎰</div>
        <h1 className="font-display neon mt-1 text-4xl text-[#ffd666]">줍줍 라운지</h1>
        <p className="mt-1 text-sm text-white/70">무료 칩으로 즐기는 두근두근 미니 카지노</p>
      </header>

      {wins.length > 0 && (
        <div className="no-scrollbar mx-4 mt-4 flex gap-2 overflow-x-auto rounded-2xl bg-black/25 px-3 py-2 text-xs">
          <span className="shrink-0 font-bold text-[#ffd666]">🔥 방금 터졌어요</span>
          {wins.map((w, i) => (
            <span key={i} className="shrink-0 text-white/80">
              {w.nickname}님 {GAME_NAME[w.game]} <b className="text-[#ffd666]">×{Math.round(w.mult)}</b> 🪙{Number(w.payout).toLocaleString()}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 px-4">
        {state ? (
          <ChipWallet
            chips={state.chips}
            canClaim={state.canClaim}
            claimKind={state.claimKind}
            points={user!.pointsAvailable}
            convert={CASINO.convert}
          />
        ) : (
          <Link href="/login?next=/casino" className="btn-pop block rounded-3xl bg-[#ffd666] py-4 text-center font-black text-[#3b2a1a]">
            로그인하고 무료 칩 {CASINO.dailyChips.toLocaleString()}개 받기
          </Link>
        )}
      </div>

      <section className="mt-5 space-y-3 px-4">
        {GAMES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className={`btn-pop relative flex items-center gap-4 overflow-hidden rounded-[28px] bg-gradient-to-br ${g.bg} p-5`}
          >
            <span className="text-6xl drop-shadow-lg">{g.icon}</span>
            <div>
              <div className="font-display text-2xl">{g.name}</div>
              <div className="text-sm text-white/85">{g.desc}</div>
            </div>
            <span className="ml-auto text-2xl">›</span>
          </Link>
        ))}
      </section>

      <section className="mt-6 px-4">
        <h2 className="font-display text-xl text-[#ffd666]">🛍️ 라운지 전용 꾸미기</h2>
        <p className="text-xs text-white/60">칩으로만 살 수 있는 한정 아이템</p>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {shop.map((i) => (
            <ChipShopItem key={i.id} id={i.id} name={i.name} image={i.image} slot={i.slot} rarity={i.rarity} price={Number(i.priceChips)} owned={i.owned} />
          ))}
        </div>
      </section>

      <section className="mx-4 mt-6 rounded-[28px] bg-white/10 p-4">
        <h2 className="font-display text-xl text-[#ffd666]">👑 이번 주 칩 부자</h2>
        <ol className="mt-2 space-y-1.5 text-sm">
          {ranking.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2">
              <span className="w-6 text-center">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
              <span>{r.userChar ?? "🐥"}</span>
              <span className="flex-1 truncate">{r.nickname}</span>
              <b className="tabular-nums text-[#ffd666]">+🪙{Number(r.net).toLocaleString()}</b>
            </li>
          ))}
          {ranking.length === 0 && <li className="text-white/60">이번 주 첫 잭팟의 주인공이 되어보세요!</li>}
        </ol>
        <p className="mt-2 text-[10px] text-white/50">랭킹은 명예용이에요. 순위에 따른 포인트·현금 보상은 없어요.</p>
      </section>

      <details className="mx-4 mt-4 rounded-2xl bg-black/20 p-3 text-[11px] leading-relaxed text-white/60">
        <summary className="cursor-pointer font-bold text-white/80">라운지 이용 안내 · 확률 공개</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>줍칩은 게임 전용 칩으로 현금·포인트·상품권으로 환전·양도할 수 없어요.</li>
          <li>모든 결과는 서버의 난수로 공정하게 결정돼요. 이론 환수율: 슬롯 {(slotRtp() * 100).toFixed(1)}% · 룰렛 97.3% · 로켓 99%.</li>
          <li>매일 무료 칩 {CASINO.dailyChips.toLocaleString()}개, 칩이 {CASINO.refillBelow}개 미만이면 하루 한 번 긴급 리필 {CASINO.refillChips}개.</li>
          <li>베팅은 한 번에 {CASINO.minBet}~{CASINO.maxBet.toLocaleString()}칩. 너무 오래 했다면 잠깐 쉬어가요 🍵</li>
        </ul>
      </details>
    </div>
  );
}
