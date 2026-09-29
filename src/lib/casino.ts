import { randomInt } from "node:crypto";
import type postgres from "postgres";
import { sql } from "./db";
import { debit } from "./rewards";

/**
 * 줍줍 카지노 라운지 — 전용 화폐 "줍칩".
 *
 * 규제 경계 (사행성 방지):
 *  - 칩은 현금·포인트·상품권으로 환전되지 않는다. 칩 → 포인트 경로는 코드 어디에도 없다.
 *  - 칩으로 살 수 있는 건 카지노 전용 꾸미기뿐이며, 이 아이템은 포인트로 팔지 않는다.
 *  - 포인트 → 칩은 단방향·하루 한도. 칩을 현금으로 파는 기능 없음.
 *  - 모든 결과는 서버에서 암호학적 난수로 결정하고, 배당표·확률을 화면에 공개한다.
 */
export const CASINO = {
  dailyChips: 1000,
  refillChips: 500,
  refillBelow: 50,
  convert: { pointsPerUnit: 100, chipsPerUnit: 1000, maxPointsPerDay: 1000 },
  minBet: 10,
  maxBet: 50_000,
} as const;

export class CasinoError extends Error {}

type Tx = postgres.TransactionSql;
const today = sql`(now() AT TIME ZONE 'Asia/Seoul')::date`;

// ---------------- 슬롯머신 ----------------
export const SLOT_SYMBOLS = [
  { s: "🍒", w: 30 },
  { s: "🍋", w: 25 },
  { s: "🍇", w: 20 },
  { s: "🔔", w: 12 },
  { s: "⭐", w: 7 },
  { s: "💎", w: 4 },
  { s: "🐥", w: 2 }, // 줍줍이 = 잭팟
] as const;
/** 같은 그림 3개 배당 (베팅액 배수) */
export const SLOT_PAYTABLE: Record<string, number> = {
  "🍒": 4,
  "🍋": 10,
  "🍇": 15,
  "🔔": 50,
  "⭐": 120,
  "💎": 400,
  "🐥": 3000,
};
/** 체리 2개(아무 위치) 배당 · 체리 1개 배당 */
export const SLOT_CHERRY_TWO = 2;
export const SLOT_CHERRY_ONE = 0;
const SLOT_TOTAL = SLOT_SYMBOLS.reduce((a, x) => a + x.w, 0);

function spinReel() {
  let r = randomInt(SLOT_TOTAL);
  for (const x of SLOT_SYMBOLS) if ((r -= x.w) < 0) return x.s;
  return SLOT_SYMBOLS[0].s;
}

export function slotMultiplier(reels: string[]) {
  if (reels[0] === reels[1] && reels[1] === reels[2]) return SLOT_PAYTABLE[reels[0]] ?? 0;
  const cherries = reels.filter((r) => r === "🍒").length;
  if (cherries === 2) return SLOT_CHERRY_TWO;
  if (cherries === 1) return SLOT_CHERRY_ONE;
  return 0;
}

/** 이론 환수율 (테스트·화면 공개용) */
export function slotRtp() {
  const p = Object.fromEntries(SLOT_SYMBOLS.map((x) => [x.s, x.w / SLOT_TOTAL]));
  const pc = p["🍒"];
  let rtp = 0;
  for (const x of SLOT_SYMBOLS) rtp += p[x.s] ** 3 * SLOT_PAYTABLE[x.s];
  rtp += 3 * pc * pc * (1 - pc) * SLOT_CHERRY_TWO;
  rtp += 3 * pc * (1 - pc) ** 2 * SLOT_CHERRY_ONE;
  return rtp;
}

// ---------------- 룰렛 (유럽식 0~36) ----------------
export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export type RouletteBet =
  | { type: "color"; value: "red" | "black" }
  | { type: "parity"; value: "odd" | "even" }
  | { type: "half"; value: "low" | "high" }
  | { type: "number"; value: number };

export function rouletteMultiplier(n: number, bet: RouletteBet) {
  if (bet.type === "number") return n === bet.value ? 36 : 0;
  if (n === 0) return 0;
  if (bet.type === "color") return (bet.value === "red") === RED.has(n) ? 2 : 0;
  if (bet.type === "parity") return (bet.value === "odd") === (n % 2 === 1) ? 2 : 0;
  return (bet.value === "low") === (n <= 18) ? 2 : 0;
}

// ---------------- 로켓 (크래시) ----------------
/** 폭발 배수: 1% 하우스 엣지. P(crash ≥ x) = 0.99 / x */
export function rocketCrashPoint(u = randomInt(1, 1_000_000) / 1_000_000) {
  return Math.max(1, Math.floor((0.99 / u) * 100) / 100);
}

// ---------------- 공통: 베팅 처리 ----------------
async function settleBet(tx: Tx, userId: number, game: string, bet: number, multiplier: number, detail: object) {
  if (!Number.isInteger(bet) || bet < CASINO.minBet || bet > CASINO.maxBet) {
    throw new CasinoError(`베팅은 ${CASINO.minBet}~${CASINO.maxBet.toLocaleString()}칩이에요`);
  }
  const payout = Math.floor(bet * multiplier);
  const res = await tx<{ chips: number }[]>`
    UPDATE users SET chips = chips - ${bet} + ${payout} WHERE id = ${userId} AND chips >= ${bet} RETURNING chips`;
  if (!res.length) throw new CasinoError("칩이 부족해요");
  await tx`
    INSERT INTO chip_ledger (user_id, game, bet, payout, delta, detail)
    VALUES (${userId}, ${game}, ${bet}, ${payout}, ${payout - bet}, ${tx.json(detail as never)})`;
  return { payout, chips: Number(res[0].chips) };
}

export async function playSlot(userId: number, bet: number) {
  const reels = [spinReel(), spinReel(), spinReel()];
  const mult = slotMultiplier(reels);
  const r = await sql.begin((tx) => settleBet(tx, userId, "slot", bet, mult, { reels }));
  return { reels, multiplier: mult, ...r, jackpot: reels.every((x) => x === "🐥") };
}

export async function playRoulette(userId: number, bet: number, choice: RouletteBet) {
  const n = randomInt(37);
  const mult = rouletteMultiplier(n, choice);
  const r = await sql.begin((tx) => settleBet(tx, userId, "roulette", bet, mult, { n, choice }));
  return { number: n, color: n === 0 ? "green" : RED.has(n) ? "red" : "black", multiplier: mult, ...r };
}

export async function playRocket(userId: number, bet: number, target: number) {
  if (!(target >= 1.01 && target <= 100)) throw new CasinoError("목표 배수는 1.01~100배예요");
  const crash = rocketCrashPoint();
  const win = crash >= target;
  const r = await sql.begin((tx) => settleBet(tx, userId, "rocket", bet, win ? target : 0, { crash, target }));
  return { crash, target, win, multiplier: win ? target : 0, ...r };
}

// ---------------- 칩 얻기 ----------------
export async function claimChips(userId: number) {
  return sql.begin(async (tx) => {
    const [u] = await tx<{ chips: number; daily: boolean; refill: boolean }[]>`
      SELECT chips, (chips_daily_at = ${today}) AS daily, (chips_refill_at = ${today}) AS refill
      FROM users WHERE id = ${userId} FOR UPDATE`;
    let kind: "daily" | "refill";
    let amount: number;
    if (!u.daily) {
      kind = "daily";
      amount = CASINO.dailyChips;
      await tx`UPDATE users SET chips = chips + ${amount}, chips_daily_at = ${today} WHERE id = ${userId}`;
    } else if (!u.refill && Number(u.chips) < CASINO.refillBelow) {
      kind = "refill";
      amount = CASINO.refillChips;
      await tx`UPDATE users SET chips = chips + ${amount}, chips_refill_at = ${today} WHERE id = ${userId}`;
    } else {
      throw new CasinoError(u.refill || Number(u.chips) >= CASINO.refillBelow ? "오늘 무료 칩은 이미 받았어요" : "");
    }
    await tx`INSERT INTO chip_ledger (user_id, game, delta) VALUES (${userId}, ${kind}, ${amount})`;
    return { kind, amount };
  });
}

/** 포인트 → 칩 (단방향, 하루 한도) */
export async function convertPoints(userId: number, points: number) {
  const { pointsPerUnit, chipsPerUnit, maxPointsPerDay } = CASINO.convert;
  if (!Number.isInteger(points) || points <= 0 || points % pointsPerUnit !== 0) {
    throw new CasinoError(`${pointsPerUnit}P 단위로 바꿀 수 있어요`);
  }
  return sql.begin(async (tx) => {
    await tx`SELECT 1 FROM users WHERE id = ${userId} FOR UPDATE`;
    const [{ used }] = await tx<{ used: number }[]>`
      SELECT COALESCE(-sum(delta), 0)::int AS used FROM points_ledger
      WHERE user_id = ${userId} AND kind = 'chips'
        AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`;
    if (used + points > maxPointsPerDay) throw new CasinoError(`포인트 → 칩 교환은 하루 ${maxPointsPerDay.toLocaleString()}P까지예요`);
    await debit(tx, userId, points, "chips", "줍칩 교환");
    const chips = (points / pointsPerUnit) * chipsPerUnit;
    await tx`UPDATE users SET chips = chips + ${chips} WHERE id = ${userId}`;
    await tx`INSERT INTO chip_ledger (user_id, game, delta, detail) VALUES (${userId}, 'convert', ${chips}, ${tx.json({ points })})`;
    return { chips };
  });
}

/** 카지노 전용 꾸미기 구매 (칩으로만) */
export async function buyWithChips(userId: number, itemId: number) {
  return sql.begin(async (tx) => {
    const [item] = await tx<{ id: number; name: string; priceChips: number | null }[]>`
      SELECT id, name, price_chips FROM shop_items WHERE id = ${itemId} AND active AND kind = 'cosmetic'`;
    if (!item?.priceChips) throw new CasinoError("칩으로 살 수 없는 아이템이에요");
    const [owned] = await tx`SELECT 1 FROM user_items WHERE user_id = ${userId} AND item_id = ${itemId}`;
    if (owned) throw new CasinoError("이미 가지고 있어요");
    const res = await tx`UPDATE users SET chips = chips - ${item.priceChips} WHERE id = ${userId} AND chips >= ${item.priceChips}`;
    if (!res.count) throw new CasinoError("칩이 부족해요");
    await tx`INSERT INTO user_items (user_id, item_id, source) VALUES (${userId}, ${itemId}, 'casino')`;
    await tx`INSERT INTO chip_ledger (user_id, game, delta, detail) VALUES (${userId}, 'shop', ${-item.priceChips}, ${tx.json({ itemId })})`;
    return item;
  });
}

export async function casinoState(userId: number) {
  const [u] = await sql<{ chips: number; daily: boolean; refill: boolean }[]>`
    SELECT chips, COALESCE(chips_daily_at = ${today}, false) AS daily, COALESCE(chips_refill_at = ${today}, false) AS refill
    FROM users WHERE id = ${userId}`;
  const chips = Number(u.chips);
  return { chips, canClaim: !u.daily || (!u.refill && chips < CASINO.refillBelow), claimKind: !u.daily ? "daily" : "refill" };
}

/** 이번 주 순이익 랭킹 (명예 전용) */
export async function weeklyChipRanking(limit = 10) {
  return sql<{ id: number; nickname: string; userChar: string | null; net: number; bigWin: number }[]>`
    SELECT u.id, u.nickname, (SELECT image FROM shop_items WHERE item_key = u.equip_character) AS user_char,
           sum(l.delta)::bigint AS net, max(l.payout)::bigint AS big_win
    FROM chip_ledger l JOIN users u ON u.id = l.user_id
    WHERE l.game IN ('slot','roulette','rocket')
      AND l.created_at >= (date_trunc('week', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')
    GROUP BY u.id HAVING sum(l.delta) > 0 ORDER BY net DESC LIMIT ${limit}`;
}

/** 최근 큰 당첨 (라운지 전광판) */
export async function recentBigWins(limit = 8) {
  return sql<{ nickname: string; game: string; payout: number; mult: number; createdAt: Date }[]>`
    SELECT u.nickname, l.game, l.payout, (l.payout::float / NULLIF(l.bet, 0)) AS mult, l.created_at
    FROM chip_ledger l JOIN users u ON u.id = l.user_id
    WHERE l.game IN ('slot','roulette','rocket') AND l.payout >= l.bet * 10 AND l.created_at > now() - interval '3 days'
    ORDER BY l.id DESC LIMIT ${limit}`;
}
