import { randomInt } from "node:crypto";
import { sql } from "./db";
import { credit, debit } from "./rewards";

/**
 * 게임 설계 원칙 (사행성 방지):
 *  - 포인트를 "주는" 게임은 무료 참여(최저가 맞히기·럭키박스)만.
 *  - 포인트를 "쓰는" 게임(꾸미기 뽑기)은 꾸미기 아이템만 지급하고 포인트를 돌려주지 않는다. 확률은 화면에 공개.
 */
export const GAME_POLICY = {
  quiz: { rounds: 5, perCorrect: 10, perfectBonus: 20 },
  lucky: [
    { points: 5, weight: 500 },
    { points: 10, weight: 300 },
    { points: 30, weight: 150 },
    { points: 100, weight: 45 },
    { points: 500, weight: 5 },
  ],
  gacha: {
    cost: 200,
    weights: { common: 700, rare: 220, epic: 70, legendary: 10 } as Record<string, number>,
  },
} as const;

export class GameError extends Error {}

const today = sql`(now() AT TIME ZONE 'Asia/Seoul')::date`;

function pick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((a, i) => a + i.weight, 0);
  let r = randomInt(total);
  for (const i of items) if ((r -= i.weight) < 0) return i;
  return items[items.length - 1];
}

// ---------- 최저가 맞히기 ----------
interface QuizQ {
  dealId: number;
  title: string;
  image: string | null;
  merchant: string;
  options: number[];
  answer: number;
}
interface QuizState {
  questions: QuizQ[];
  idx: number;
  correct: number;
  finished: boolean;
}

function distractors(price: number) {
  const set = new Set<number>([price]);
  const factors = [0.62, 0.75, 0.85, 1.18, 1.32, 1.5];
  while (set.size < 4) {
    const f = factors[randomInt(factors.length)];
    const unit = price >= 100000 ? 1000 : price >= 10000 ? 100 : 10;
    set.add(Math.max(unit, Math.round((price * f) / unit) * unit - (price >= 10000 ? 100 : 10)));
  }
  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function quizPlay(userId: number) {
  const [row] = await sql<{ id: number; state: QuizState; reward: number }[]>`
    SELECT id, state, reward FROM game_plays WHERE user_id = ${userId} AND game = 'price_quiz' AND day = ${today}`;
  return row;
}

/** 오늘의 퀴즈 가져오기 (없으면 생성). 정답은 클라이언트에 보내지 않는다 */
export async function getQuiz(userId: number) {
  let row = await quizPlay(userId);
  if (!row) {
    const deals = await sql<{ id: number; title: string; imageUrl: string | null; merchant: string; price: number }[]>`
      SELECT id, title, image_url, merchant, price FROM deals
      WHERE price >= 1000 AND status <> 'hidden' AND created_at > now() - interval '30 days'
      ORDER BY random() LIMIT ${GAME_POLICY.quiz.rounds}`;
    if (deals.length < GAME_POLICY.quiz.rounds) throw new GameError("오늘은 문제로 낼 딜이 부족해요");
    const state: QuizState = {
      questions: deals.map((d) => {
        const options = distractors(d.price);
        return { dealId: d.id, title: d.title, image: d.imageUrl, merchant: d.merchant, options, answer: options.indexOf(d.price) };
      }),
      idx: 0,
      correct: 0,
      finished: false,
    };
    await sql`
      INSERT INTO game_plays (user_id, game, day, state) VALUES (${userId}, 'price_quiz', ${today}, ${sql.json(JSON.parse(JSON.stringify(state)))})`;
    row = (await quizPlay(userId))!;
  }
  return publicQuiz(row.state, row.reward);
}

function publicQuiz(s: QuizState, reward: number) {
  const q = s.questions[s.idx];
  return {
    round: s.idx + 1,
    rounds: s.questions.length,
    correct: s.correct,
    finished: s.finished,
    reward,
    question: s.finished ? null : { dealId: q.dealId, title: q.title, image: q.image, merchant: q.merchant, options: q.options },
  };
}

export async function answerQuiz(userId: number, choice: number) {
  return sql.begin(async (tx) => {
    const [row] = await tx<{ id: number; state: QuizState; reward: number }[]>`
      SELECT id, state, reward FROM game_plays
      WHERE user_id = ${userId} AND game = 'price_quiz' AND day = ${today} FOR UPDATE`;
    if (!row) throw new GameError("퀴즈를 먼저 시작해주세요");
    const s = row.state;
    if (s.finished) throw new GameError("오늘 퀴즈는 끝났어요. 내일 다시 도전!");
    const q = s.questions[s.idx];
    const ok = choice === q.answer;
    let gained = 0;
    if (ok) {
      s.correct++;
      gained += GAME_POLICY.quiz.perCorrect;
    }
    s.idx++;
    if (s.idx >= s.questions.length) {
      s.finished = true;
      if (s.correct === s.questions.length) gained += GAME_POLICY.quiz.perfectBonus;
    }
    if (gained) await credit(tx, userId, gained, "game", `최저가 맞히기 ${s.idx}번`, `quiz:${row.id}:${s.idx}`);
    await tx`UPDATE game_plays SET state = ${tx.json(JSON.parse(JSON.stringify(s)))}, reward = reward + ${gained} WHERE id = ${row.id}`;
    return { ok, answer: q.answer, price: q.options[q.answer], dealId: q.dealId, gained, next: publicQuiz(s, row.reward + gained) };
  });
}

// ---------- 무료 럭키박스 (하루 1회) ----------
export async function openLuckyBox(userId: number) {
  return sql.begin(async (tx) => {
    await tx`SELECT 1 FROM users WHERE id = ${userId} FOR UPDATE`;
    const [done] = await tx`SELECT 1 FROM game_plays WHERE user_id = ${userId} AND game = 'lucky_box' AND day = ${today}`;
    if (done) throw new GameError("오늘 럭키박스는 이미 열었어요");
    const prize = pick(GAME_POLICY.lucky.map((l) => ({ ...l })));
    const [play] = await tx<{ id: number }[]>`
      INSERT INTO game_plays (user_id, game, day, reward) VALUES (${userId}, 'lucky_box', ${today}, ${prize.points}) RETURNING id`;
    await credit(tx, userId, prize.points, "game", "무료 럭키박스", `lucky:${play.id}`);
    return { points: prize.points };
  });
}

export async function luckyOpenedToday(userId: number) {
  const [r] = await sql`SELECT 1 FROM game_plays WHERE user_id = ${userId} AND game = 'lucky_box' AND day = ${today}`;
  return Boolean(r);
}

// ---------- 꾸미기 뽑기 (포인트 소모 → 미보유 꾸미기 1개) ----------
export async function drawGacha(userId: number) {
  return sql.begin(async (tx) => {
    const pool = await tx<{ id: number; itemKey: string; name: string; image: string; rarity: string; slot: string }[]>`
      SELECT i.id, i.item_key, i.name, i.image, i.rarity, i.slot FROM shop_items i
      WHERE i.kind = 'cosmetic' AND i.active
        AND NOT EXISTS (SELECT 1 FROM user_items ui WHERE ui.user_id = ${userId} AND ui.item_id = i.id)`;
    if (!pool.length) throw new GameError("모든 꾸미기를 모았어요! 🎉");
    await debit(tx, userId, GAME_POLICY.gacha.cost, "gacha", "꾸미기 뽑기");
    // 등급을 먼저 뽑고(남은 등급 중), 그 등급 안에서 균등 추첨
    const rarities = [...new Set(pool.map((p) => p.rarity))].map((r) => ({ r, weight: GAME_POLICY.gacha.weights[r] ?? 1 }));
    const rarity = pick(rarities).r;
    const candidates = pool.filter((p) => p.rarity === rarity);
    const item = candidates[randomInt(candidates.length)];
    await tx`INSERT INTO user_items (user_id, item_id, source) VALUES (${userId}, ${item.id}, 'gacha')`;
    await tx`INSERT INTO game_plays (user_id, game, day, state) VALUES (${userId}, 'gacha', ${today}, ${tx.json({ itemKey: item.itemKey })})`;
    return item;
  });
}
