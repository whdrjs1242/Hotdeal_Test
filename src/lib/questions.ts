import { z } from "zod";
import { sql } from "./db";
import { credit, debit, QUESTION_POLICY } from "./rewards";

export class QuestionError extends Error {}

export interface QuestionCard {
  id: number;
  title: string;
  reward: number;
  status: string;
  answerCount: number;
  createdAt: string;
  expiresAt: string;
  userId: number;
  nickname: string;
  userChar: string | null;
}

export const createQuestionSchema = z.object({
  title: z.string().trim().min(5).max(100),
  body: z.string().trim().max(2000).optional().nullable(),
  reward: z.coerce.number().int().min(QUESTION_POLICY.minReward).max(100_000),
});

export async function listQuestions(status: "open" | "answered" | "all" = "all", limit = 30) {
  return sql<QuestionCard[]>`
    SELECT q.id, q.title, q.reward, q.status, q.answer_count, q.created_at, q.expires_at, q.user_id, u.nickname,
           (SELECT image FROM shop_items WHERE item_key = u.equip_character) AS user_char
    FROM questions q JOIN users u ON u.id = q.user_id
    WHERE ${status === "all" ? sql`q.status <> 'closed' OR q.answer_count > 0` : sql`q.status = ${status}`}
    ORDER BY (q.status = 'open') DESC, q.id DESC LIMIT ${limit}`;
}

export async function getQuestion(id: number) {
  const [q] = await sql<(QuestionCard & { body: string | null; acceptedAnswerId: number | null })[]>`
    SELECT q.id, q.title, q.body, q.reward, q.status, q.answer_count, q.accepted_answer_id, q.created_at, q.expires_at,
           q.user_id, u.nickname, (SELECT image FROM shop_items WHERE item_key = u.equip_character) AS user_char
    FROM questions q JOIN users u ON u.id = q.user_id WHERE q.id = ${id}`;
  return q ?? null;
}

export async function getAnswers(questionId: number) {
  return sql<{ id: number; body: string; votesUp: number; createdAt: string; userId: number; nickname: string; userChar: string | null }[]>`
    SELECT a.id, a.body, a.votes_up, a.created_at, a.user_id, u.nickname,
           (SELECT image FROM shop_items WHERE item_key = u.equip_character) AS user_char
    FROM answers a JOIN users u ON u.id = a.user_id
    WHERE a.question_id = ${questionId} ORDER BY a.votes_up DESC, a.id`;
}

/** 질문 등록: 건 포인트가 채택 답변의 보상이 된다 */
export async function createQuestion(userId: number, input: z.infer<typeof createQuestionSchema>) {
  return sql.begin(async (tx) => {
    await debit(tx, userId, input.reward, "question", `질문 보상: ${input.title}`);
    const [q] = await tx<{ id: number }[]>`
      INSERT INTO questions (user_id, title, body, reward, expires_at)
      VALUES (${userId}, ${input.title}, ${input.body ?? null}, ${input.reward}, now() + make_interval(days => ${QUESTION_POLICY.days}))
      RETURNING id`;
    return q.id;
  });
}

export async function addAnswer(questionId: number, userId: number, body: string) {
  return sql.begin(async (tx) => {
    const [q] = await tx<{ userId: number; status: string; title: string }[]>`
      SELECT user_id, status, title FROM questions WHERE id = ${questionId} FOR UPDATE`;
    if (!q || q.status !== "open") throw new QuestionError("마감된 질문이에요");
    if (q.userId === userId) throw new QuestionError("내 질문에는 답할 수 없어요");
    const [a] = await tx<{ id: number }[]>`
      INSERT INTO answers (question_id, user_id, body) VALUES (${questionId}, ${userId}, ${body}) RETURNING id`;
    await tx`UPDATE questions SET answer_count = answer_count + 1 WHERE id = ${questionId}`;
    await tx`
      INSERT INTO notifications (user_id, kind, title, body)
      VALUES (${q.userId}, 'answer', ${`💬 '${q.title}'에 답변이 달렸어요`}, ${body.slice(0, 80)})`;
    return a.id;
  });
}

export async function voteAnswer(answerId: number, userId: number) {
  const res = await sql`
    WITH v AS (
      INSERT INTO answer_votes (answer_id, user_id)
      SELECT ${answerId}, ${userId} WHERE NOT EXISTS (SELECT 1 FROM answers WHERE id = ${answerId} AND user_id = ${userId})
      ON CONFLICT DO NOTHING RETURNING answer_id
    )
    UPDATE answers SET votes_up = votes_up + 1 WHERE id IN (SELECT answer_id FROM v) RETURNING votes_up`;
  return res[0]?.votesUp as number | undefined;
}

/** 채택 → 답변자에게 질문 보상 전액 */
export async function acceptAnswer(questionId: number, answerId: number, byUserId?: number) {
  return sql.begin(async (tx) => {
    const [q] = await tx<{ userId: number; status: string; reward: number; title: string }[]>`
      SELECT user_id, status, reward, title FROM questions WHERE id = ${questionId} FOR UPDATE`;
    if (!q || q.status !== "open") throw new QuestionError("이미 마감된 질문이에요");
    if (byUserId != null && q.userId !== byUserId) throw new QuestionError("질문자만 채택할 수 있어요");
    const [a] = await tx<{ userId: number }[]>`SELECT user_id FROM answers WHERE id = ${answerId} AND question_id = ${questionId}`;
    if (!a) throw new QuestionError("이 질문의 답변이 아니에요");
    await credit(tx, a.userId, q.reward, "answer_reward", `답변 채택: ${q.title}`, `question:${questionId}`);
    await tx`UPDATE questions SET status = 'answered', accepted_answer_id = ${answerId} WHERE id = ${questionId}`;
    await tx`
      INSERT INTO notifications (user_id, kind, title, body)
      VALUES (${a.userId}, 'reward', ${`🏅 답변 채택! +${q.reward.toLocaleString()}P`}, ${q.title})`;
    return q.reward;
  });
}

/** 마감: 추천 1위 답변 자동 채택, 답변이 없으면 환불 */
export async function settleExpiredQuestions() {
  const rows = await sql<{ id: number }[]>`SELECT id FROM questions WHERE status = 'open' AND expires_at <= now() LIMIT 200`;
  let accepted = 0;
  let refunded = 0;
  for (const { id } of rows) {
    const [top] = await sql<{ id: number }[]>`SELECT id FROM answers WHERE question_id = ${id} ORDER BY votes_up DESC, id LIMIT 1`;
    try {
      if (top) {
        await acceptAnswer(id, top.id);
        accepted++;
      } else {
        await sql.begin(async (tx) => {
          const [q] = await tx<{ userId: number; reward: number; title: string; status: string }[]>`
            SELECT user_id, reward, title, status FROM questions WHERE id = ${id} FOR UPDATE`;
          if (!q || q.status !== "open") return;
          await credit(tx, q.userId, q.reward, "question_refund", `답변 없는 질문 환불: ${q.title}`, `question:${id}`);
          await tx`UPDATE questions SET status = 'closed' WHERE id = ${id}`;
        });
        refunded++;
      }
    } catch (e) {
      console.error("settle question failed", id, e);
    }
  }
  return { accepted, refunded };
}
