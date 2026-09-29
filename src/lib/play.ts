import { randomInt } from "node:crypto";
import type postgres from "postgres";
import { sql } from "./db";
import { debit } from "./rewards";
import { cached } from "./cache";

/**
 * 놀이터 — 게임 재화 "구슬"로 즐기는 미니게임.
 *
 * 규제 경계 (사행성 방지):
 *  - 구슬은 현금·포인트·상품권으로 바뀌지 않는다. 구슬 → 포인트 경로는 코드 어디에도 없다.
 *  - 구슬로는 놀이터 전용 꾸미기만 살 수 있고, 그 아이템은 포인트로 팔지 않는다.
 *  - 포인트 → 구슬은 단방향·하루 한도.
 *  - 결과는 서버 난수로 결정하고, 확률·이론 환급률을 화면에 공개한다.
 * DB 에서는 users.chips / chip_ledger 컬럼을 구슬 잔액·원장으로 쓴다.
 */
export const PLAY = {
  daily: 1000,
  refill: 500,
  refillBelow: 50,
  convert: { pointsPerUnit: 100, marblesPerUnit: 1000, maxPointsPerDay: 1000 },
} as const;

export class PlayError extends Error {}
type Tx = postgres.TransactionSql;
const today = sql`(now() AT TIME ZONE 'Asia/Seoul')::date`;

function weighted<T extends { w: number }>(items: readonly T[]): T {
  const total = items.reduce((a, x) => a + x.w, 0);
  let r = randomInt(total);
  for (const x of items) if ((r -= x.w) < 0) return x;
  return items[items.length - 1];
}
const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const rtpOf = (table: readonly { prize: number; w: number }[], cost: number) =>
  table.reduce((a, x) => a + x.prize * x.w, 0) / table.reduce((a, x) => a + x.w, 0) / cost;

/** 구슬 차감 + 지급을 한 번에 기록 */
async function settle(tx: Tx, userId: number, game: string, bet: number, payout: number, detail: object) {
  const res = await tx<{ chips: number }[]>`
    UPDATE users SET chips = chips - ${bet} + ${payout} WHERE id = ${userId} AND chips >= ${bet} RETURNING chips`;
  if (!res.length) throw new PlayError("구슬이 부족해요");
  await tx`
    INSERT INTO chip_ledger (user_id, game, bet, payout, delta, detail)
    VALUES (${userId}, ${game}, ${bet}, ${payout}, ${payout - bet}, ${tx.json(detail as never)})`;
  return Number(res[0].chips);
}

// ───────────── 뽑기 캡슐 ─────────────
export const CAPSULE = {
  cost: 100,
  table: [
    { prize: 0, w: 497 },
    { prize: 50, w: 200 },
    { prize: 100, w: 150 },
    { prize: 200, w: 100 },
    { prize: 500, w: 40 },
    { prize: 1000, w: 10 },
    { prize: 5000, w: 3 },
  ],
} as const;

export async function drawCapsules(userId: number, count: 1 | 10) {
  const prizes: number[] = Array.from({ length: count }, () => weighted(CAPSULE.table).prize);
  const bet = CAPSULE.cost * count;
  const payout = prizes.reduce((a, b) => a + b, 0);
  const marbles = await sql.begin((tx) => settle(tx, userId, "capsule", bet, payout, { prizes }));
  return { prizes, payout, bet, marbles };
}

// ───────────── 긁는 쿠폰 ─────────────
export const SCRATCH = {
  cost: 200,
  amounts: [100, 200, 400, 1000, 3000, 10000],
  table: [
    { prize: 0, w: 477 },
    { prize: 100, w: 250 },
    { prize: 200, w: 150 },
    { prize: 400, w: 80 },
    { prize: 1000, w: 30 },
    { prize: 3000, w: 10 },
    { prize: 10000, w: 3 },
  ],
} as const;

/** 같은 금액 3칸이면 당첨. 결과를 먼저 정하고, 그에 맞는 9칸을 만든다 */
export function scratchGrid(prize: number): number[] {
  const cells: number[] = prize ? [prize, prize, prize] : [];
  const others: number[] = SCRATCH.amounts.filter((a) => a !== prize);
  const count = new Map<number, number>();
  // 꽝이면 큰 금액 2칸을 자주 넣어 "아깝다" 느낌을 준다
  if (!prize && randomInt(2) === 0) {
    const big = others[others.length - 1 - randomInt(3)];
    cells.push(big, big);
    count.set(big, 2);
  }
  while (cells.length < 9) {
    const a = others[randomInt(others.length)];
    if ((count.get(a) ?? 0) >= 2) continue;
    count.set(a, (count.get(a) ?? 0) + 1);
    cells.push(a);
  }
  return shuffle(cells);
}

export async function buyScratch(userId: number) {
  const prize: number = weighted(SCRATCH.table).prize;
  const grid = scratchGrid(prize);
  const marbles = await sql.begin((tx) => settle(tx, userId, "scratch", SCRATCH.cost, prize, { prize, grid }));
  return { prize, grid, marbles };
}

// ───────────── 가격 업다운 ─────────────
/**
 * 지금 상품보다 다음 상품이 비쌀까, 쌀까? 맞히면 판돈이 배당만큼 불어나고, 언제든 멈춰서 챙길 수 있다.
 * 배당은 실제 딜 가격 분포에서 계산한 확률로 정한다 (배당 = 0.95 ÷ 확률) → 어느 쪽을 골라도 기대 환급률 95%.
 */
export const UPDOWN = { minBet: 50, maxBet: 20000, maxSteps: 10, edge: 0.95 } as const;

interface Card {
  id: number;
  title: string;
  image: string | null;
  merchant: string;
  price: number;
}
interface UpdownState {
  active: boolean;
  bet: number;
  pot: number;
  step: number;
  current: Card;
  history: Card[];
}

const pricePool = () =>
  cached("play:pool", 120, async () => {
    const rows = await sql<Card[]>`
      SELECT id, title, image_url AS image, merchant, price FROM deals
      WHERE price >= 1000 AND status <> 'hidden' ORDER BY id DESC LIMIT 600`;
    return rows.map((r) => ({ ...r, price: Number(r.price) }));
  });

export function updownOdds(pool: Card[], price: number) {
  const higher = pool.filter((c) => c.price > price).length;
  const lower = pool.filter((c) => c.price < price).length;
  const n = higher + lower || 1;
  const mult = (k: number) => {
    const p = k / n;
    if (p === 0) return null;
    const m = Math.floor((UPDOWN.edge / p) * 100) / 100;
    return m >= 1.01 ? m : null; // 거의 확실한 쪽은 선택 불가
  };
  return { up: mult(higher), down: mult(lower), pUp: higher / n, pDown: lower / n };
}

async function activeUpdown(tx: Tx | typeof sql, userId: number, lock = false) {
  const [row] = await tx<{ id: number; state: UpdownState }[]>`
    SELECT id, state FROM game_plays
    WHERE user_id = ${userId} AND game = 'updown' AND (state->>'active')::boolean
    ORDER BY id DESC LIMIT 1 ${lock ? tx`FOR UPDATE` : tx``}`;
  return row;
}

async function publicUpdown(s: UpdownState) {
  const pool = await pricePool();
  const odds = updownOdds(pool, s.current.price);
  return { ...s, odds };
}

export async function updownState(userId: number) {
  const row = await activeUpdown(sql, userId);
  return row ? publicUpdown(row.state) : null;
}

export async function updownStart(userId: number, bet: number) {
  if (!Number.isInteger(bet) || bet < UPDOWN.minBet || bet > UPDOWN.maxBet) {
    throw new PlayError(`구슬은 ${UPDOWN.minBet}~${UPDOWN.maxBet.toLocaleString()}개까지 걸 수 있어요`);
  }
  const pool = await pricePool();
  if (pool.length < 30) throw new PlayError("지금은 게임에 쓸 상품이 부족해요");
  return sql.begin(async (tx) => {
    if (await activeUpdown(tx, userId, true)) throw new PlayError("진행 중인 게임이 있어요");
    const res = await tx`UPDATE users SET chips = chips - ${bet} WHERE id = ${userId} AND chips >= ${bet}`;
    if (!res.count) throw new PlayError("구슬이 부족해요");
    let current = pool[randomInt(pool.length)];
    // 양쪽 모두 고를 수 있는 가격대에서 시작
    for (let i = 0; i < 20 && (!updownOdds(pool, current.price).up || !updownOdds(pool, current.price).down); i++) {
      current = pool[randomInt(pool.length)];
    }
    const state: UpdownState = { active: true, bet, pot: bet, step: 0, current, history: [] };
    await tx`INSERT INTO game_plays (user_id, game, day, state) VALUES (${userId}, 'updown', ${today}, ${tx.json(state as never)})`;
    return publicUpdown(state);
  });
}

async function finishUpdown(tx: Tx, userId: number, rowId: number, s: UpdownState, payout: number) {
  s.active = false;
  await tx`UPDATE game_plays SET state = ${tx.json(s as never)}, reward = ${payout} WHERE id = ${rowId}`;
  const [u] = await tx<{ chips: number }[]>`UPDATE users SET chips = chips + ${payout} WHERE id = ${userId} RETURNING chips`;
  await tx`
    INSERT INTO chip_ledger (user_id, game, bet, payout, delta, detail)
    VALUES (${userId}, 'updown', ${s.bet}, ${payout}, ${payout - s.bet}, ${tx.json({ steps: s.step } as never)})`;
  return Number(u.chips);
}

export async function updownGuess(userId: number, dir: "up" | "down") {
  const pool = await pricePool();
  return sql.begin(async (tx) => {
    const row = await activeUpdown(tx, userId, true);
    if (!row) throw new PlayError("진행 중인 게임이 없어요");
    const s = row.state;
    const odds = updownOdds(pool, s.current.price);
    const mult = odds[dir];
    if (!mult) throw new PlayError("이 선택은 할 수 없어요");
    const candidates = pool.filter((c) => c.price !== s.current.price && c.id !== s.current.id);
    const next = candidates[randomInt(candidates.length)];
    const correct = dir === "up" ? next.price > s.current.price : next.price < s.current.price;
    s.history.push(s.current);
    s.current = next;
    if (!correct) {
      s.pot = 0;
      const marbles = await finishUpdown(tx, userId, row.id, s, 0);
      return { correct, next, mult, marbles, state: { ...s, odds: updownOdds(pool, next.price) } };
    }
    s.pot = Math.floor(s.pot * mult);
    s.step++;
    if (s.step >= UPDOWN.maxSteps) {
      const marbles = await finishUpdown(tx, userId, row.id, s, s.pot);
      return { correct, next, mult, marbles, auto: true, state: { ...s, odds: updownOdds(pool, next.price) } };
    }
    await tx`UPDATE game_plays SET state = ${tx.json(s as never)} WHERE id = ${row.id}`;
    return { correct, next, mult, state: { ...s, odds: updownOdds(pool, next.price) } };
  });
}

export async function updownStop(userId: number) {
  return sql.begin(async (tx) => {
    const row = await activeUpdown(tx, userId, true);
    if (!row) throw new PlayError("진행 중인 게임이 없어요");
    if (row.state.step < 1) throw new PlayError("한 번은 맞혀야 챙길 수 있어요");
    const payout = row.state.pot;
    const marbles = await finishUpdown(tx, userId, row.id, row.state, payout);
    return { payout, marbles };
  });
}

// ───────────── 구슬 얻기 ─────────────
export async function claimMarbles(userId: number) {
  return sql.begin(async (tx) => {
    const [u] = await tx<{ chips: number; daily: boolean; refill: boolean }[]>`
      SELECT chips, COALESCE(chips_daily_at = ${today}, false) AS daily, COALESCE(chips_refill_at = ${today}, false) AS refill
      FROM users WHERE id = ${userId} FOR UPDATE`;
    let kind: "daily" | "refill";
    let amount: number;
    if (!u.daily) {
      kind = "daily";
      amount = PLAY.daily;
      await tx`UPDATE users SET chips = chips + ${amount}, chips_daily_at = ${today} WHERE id = ${userId}`;
    } else if (!u.refill && Number(u.chips) < PLAY.refillBelow) {
      kind = "refill";
      amount = PLAY.refill;
      await tx`UPDATE users SET chips = chips + ${amount}, chips_refill_at = ${today} WHERE id = ${userId}`;
    } else {
      throw new PlayError("오늘 받을 수 있는 구슬을 모두 받았어요");
    }
    await tx`INSERT INTO chip_ledger (user_id, game, delta) VALUES (${userId}, ${kind}, ${amount})`;
    return { kind, amount };
  });
}

export async function convertPoints(userId: number, points: number) {
  const { pointsPerUnit, marblesPerUnit, maxPointsPerDay } = PLAY.convert;
  if (!Number.isInteger(points) || points <= 0 || points % pointsPerUnit !== 0) {
    throw new PlayError(`${pointsPerUnit}P 단위로 바꿀 수 있어요`);
  }
  return sql.begin(async (tx) => {
    await tx`SELECT 1 FROM users WHERE id = ${userId} FOR UPDATE`;
    const [{ used }] = await tx<{ used: number }[]>`
      SELECT COALESCE(-sum(delta), 0)::int AS used FROM points_ledger
      WHERE user_id = ${userId} AND kind = 'chips'
        AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`;
    if (used + points > maxPointsPerDay) throw new PlayError(`포인트는 하루 ${maxPointsPerDay.toLocaleString()}P까지 구슬로 바꿀 수 있어요`);
    await debit(tx, userId, points, "chips", "구슬로 교환");
    const marbles = (points / pointsPerUnit) * marblesPerUnit;
    await tx`UPDATE users SET chips = chips + ${marbles} WHERE id = ${userId}`;
    await tx`INSERT INTO chip_ledger (user_id, game, delta, detail) VALUES (${userId}, 'convert', ${marbles}, ${tx.json({ points })})`;
    return { marbles };
  });
}

export async function buyWithMarbles(userId: number, itemId: number) {
  return sql.begin(async (tx) => {
    const [item] = await tx<{ id: number; name: string; priceChips: number | null }[]>`
      SELECT id, name, price_chips FROM shop_items WHERE id = ${itemId} AND active AND kind = 'cosmetic'`;
    if (!item?.priceChips) throw new PlayError("구슬로 살 수 없는 아이템이에요");
    const [owned] = await tx`SELECT 1 FROM user_items WHERE user_id = ${userId} AND item_id = ${itemId}`;
    if (owned) throw new PlayError("이미 가지고 있어요");
    const res = await tx`UPDATE users SET chips = chips - ${item.priceChips} WHERE id = ${userId} AND chips >= ${item.priceChips}`;
    if (!res.count) throw new PlayError("구슬이 부족해요");
    await tx`INSERT INTO user_items (user_id, item_id, source) VALUES (${userId}, ${itemId}, 'play')`;
    await tx`INSERT INTO chip_ledger (user_id, game, delta, detail) VALUES (${userId}, 'shop', ${-item.priceChips}, ${tx.json({ itemId })})`;
    return item;
  });
}

export async function playState(userId: number) {
  const [u] = await sql<{ chips: number; daily: boolean; refill: boolean }[]>`
    SELECT chips, COALESCE(chips_daily_at = ${today}, false) AS daily, COALESCE(chips_refill_at = ${today}, false) AS refill
    FROM users WHERE id = ${userId}`;
  const marbles = Number(u.chips);
  const canClaim = !u.daily || (!u.refill && marbles < PLAY.refillBelow);
  return { marbles, canClaim, claimKind: !u.daily ? ("daily" as const) : ("refill" as const) };
}

/** 이번 주 많이 모은 사람 (명예 전용) */
export async function weeklyRanking(limit = 10) {
  return sql<{ id: number; nickname: string; userChar: string | null; net: number }[]>`
    SELECT u.id, u.nickname, (SELECT image FROM shop_items WHERE item_key = u.equip_character) AS user_char,
           sum(l.delta)::bigint AS net
    FROM chip_ledger l JOIN users u ON u.id = l.user_id
    WHERE l.game IN ('capsule','scratch','updown')
      AND l.created_at >= (date_trunc('week', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')
    GROUP BY u.id HAVING sum(l.delta) > 0 ORDER BY net DESC LIMIT ${limit}`;
}
