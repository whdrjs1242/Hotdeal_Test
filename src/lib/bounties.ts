import { z } from "zod";
import { sql } from "./db";
import { env } from "./env";
import { CATEGORY_IDS } from "./categories";
import { BOUNTY_POLICY, credit, debit } from "./rewards";
import { pushToUsers } from "./push";
import type { DealCard } from "./deals";

export interface BountyCard {
  id: number;
  title: string;
  targetPrice: number | null;
  category: string;
  imageUrl: string | null;
  pot: number;
  status: string;
  expiresAt: string;
  participantCount: number;
  commentCount: number;
  foundCount: number;
  createdAt: string;
  userId: number;
  nickname: string;
  userXp: number;
  bestPrice: number | null;
}

export interface BountyDetail extends BountyCard {
  description: string | null;
  stake: number;
  shareCount: number;
  awardedDealId: number | null;
}

const DECAY = 45_000;
const EPOCH = 1_767_225_600;
/** 수배 인기 점수: 참여자·현상금·발견·공유 + 시간 감쇠 (딜 핫 점수와 같은 방식) */
const BOUNTY_HOT_SQL = sql`
  (log(greatest(participant_count + pot / 100.0 + found_count * 2 + share_count * 0.5 + comment_count * 0.3, 1))
   + (extract(epoch from created_at) - ${EPOCH}) / ${DECAY})`;

export async function refreshBountyScore(id: number) {
  await sql`UPDATE bounties SET hot_score = ${BOUNTY_HOT_SQL}, updated_at = now() WHERE id = ${id}`;
}

const CARD_COLS = sql`
  b.id, b.title, b.target_price, b.category, b.image_url, b.pot, b.status, b.expires_at, b.participant_count,
  b.comment_count, b.found_count, b.created_at, b.user_id, u.nickname, u.xp AS user_xp,
  (SELECT min(price) FROM deals d WHERE d.bounty_id = b.id AND d.status <> 'hidden') AS best_price`;

export type BountySort = "hot" | "new" | "ending" | "found";

export async function listBounties(p: { sort?: BountySort; cursor?: string | null; q?: string | null; limit?: number; userId?: number }) {
  const limit = Math.min(p.limit ?? 20, 50);
  const sort = p.sort ?? "hot";
  const q = p.q?.trim() ? p.q.trim().slice(0, 50) : null;
  const [c1, c2] = (p.cursor ?? "").split("_");
  const has = Boolean(p.cursor && c2);
  const where = sql`
    ${p.userId
      ? sql`b.status <> 'canceled'` // 내 수배지: 종료된 것까지 모두
      : sort === "found"
        ? sql`b.status IN ('open','awarded') AND b.found_count > 0`
        : sql`b.status = 'open' AND b.expires_at > now()`}
    ${q ? sql`AND b.title ILIKE ${"%" + q.replace(/[%_\\]/g, "\\$&") + "%"}` : sql``}
    ${p.userId ? sql`AND b.user_id = ${p.userId}` : sql``}`;
  let rows: (BountyCard & { hotScore: number })[];
  if (sort === "ending") {
    rows = await sql`
      SELECT ${CARD_COLS}, b.hot_score FROM bounties b JOIN users u ON u.id = b.user_id
      WHERE ${where} ${has ? sql`AND (b.expires_at, b.id) > (${new Date(Number(c1))}, ${Number(c2)})` : sql``}
      ORDER BY b.expires_at, b.id LIMIT ${limit + 1}`;
  } else if (sort === "new" || sort === "found") {
    rows = await sql`
      SELECT ${CARD_COLS}, b.hot_score FROM bounties b JOIN users u ON u.id = b.user_id
      WHERE ${where} ${has ? sql`AND b.id < ${Number(c2)}` : sql``}
      ORDER BY b.id DESC LIMIT ${limit + 1}`;
  } else {
    rows = await sql`
      SELECT ${CARD_COLS}, b.hot_score FROM bounties b JOIN users u ON u.id = b.user_id
      WHERE ${where} ${has ? sql`AND (b.hot_score, b.id) < (${Number(c1)}, ${Number(c2)})` : sql``}
      ORDER BY b.hot_score DESC, b.id DESC LIMIT ${limit + 1}`;
  }
  const more = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor = !more || !last
    ? null
    : sort === "ending"
      ? `${new Date(last.expiresAt).getTime()}_${last.id}`
      : sort === "hot"
        ? `${last.hotScore}_${last.id}`
        : `0_${last.id}`;
  return { items: items.map(({ hotScore: _h, ...r }) => r as BountyCard), nextCursor };
}

export async function getBounty(id: number): Promise<BountyDetail | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const [b] = await sql<BountyDetail[]>`
    SELECT ${CARD_COLS}, b.description, b.stake, b.share_count, b.awarded_deal_id
    FROM bounties b JOIN users u ON u.id = b.user_id WHERE b.id = ${id} AND b.status <> 'canceled'`;
  return b ?? null;
}

/** 수배에 올라온 발견 상품 (유저 평가순) */
export async function getSubmissions(bountyId: number) {
  return sql<(DealCard & { score: number })[]>`
    SELECT d.id, d.title, d.image_url, d.price, d.original_price, d.shipping, d.merchant, d.category, d.status,
           d.ends_at, d.votes_up, d.votes_down, d.comment_count, d.click_count, d.share_count, d.created_at,
           d.user_id, u.nickname, u.xp AS user_xp, d.bounty_id,
           (SELECT image FROM shop_items WHERE item_key = u.equip_character) AS user_char, (d.votes_up - d.votes_down) AS score
    FROM deals d JOIN users u ON u.id = d.user_id
    WHERE d.bounty_id = ${bountyId} AND d.status <> 'hidden'
    ORDER BY (d.votes_up - d.votes_down) DESC, d.price ASC NULLS LAST, d.id`;
}

export async function getBountyComments(bountyId: number) {
  return sql<{ id: number; body: string; createdAt: string; userId: number; nickname: string; xp: number; userChar: string | null }[]>`
    SELECT c.id, c.body, c.created_at, c.user_id, u.nickname, u.xp,
           (SELECT image FROM shop_items WHERE item_key = u.equip_character) AS user_char
    FROM bounty_comments c JOIN users u ON u.id = c.user_id
    WHERE c.bounty_id = ${bountyId} ORDER BY c.id LIMIT 300`;
}

export async function getParticipation(bountyId: number, userId: number) {
  const [p] = await sql<{ contributed: number }[]>`
    SELECT contributed FROM bounty_participants WHERE bounty_id = ${bountyId} AND user_id = ${userId}`;
  return p ?? null;
}

export const createBountySchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional().nullable(),
  targetPrice: z.coerce.number().int().positive().max(1_000_000_000).optional().nullable(),
  category: z.string().refine((c) => CATEGORY_IDS.includes(c)).default("etc"),
  imageUrl: z.string().url().max(1000).optional().nullable().or(z.literal("")),
  stake: z.coerce.number().int().min(BOUNTY_POLICY.minStake).max(1_000_000),
  days: z.coerce.number().int().min(1).max(BOUNTY_POLICY.maxDays),
});

/** 수배지 등록: 수배자가 건 포인트가 현상금이 된다 */
export async function createBounty(userId: number, input: z.infer<typeof createBountySchema>) {
  return sql.begin(async (tx) => {
    await debit(tx, userId, input.stake, "bounty_stake", `수배지 현상금: ${input.title}`);
    const [b] = await tx<{ id: number }[]>`
      INSERT INTO bounties (user_id, title, description, target_price, category, image_url, stake, pot, expires_at)
      VALUES (${userId}, ${input.title}, ${input.description ?? null}, ${input.targetPrice ?? null}, ${input.category},
              ${input.imageUrl || null}, ${input.stake}, ${input.stake}, now() + make_interval(days => ${input.days}))
      RETURNING id`;
    await tx`UPDATE bounties SET hot_score = ${BOUNTY_HOT_SQL} WHERE id = ${b.id}`;
    return b.id;
  });
}

/** 참여 ("나도 찾아요"). 이미 참여 중이면 false */
export async function joinBounty(bountyId: number, userId: number) {
  return sql.begin(async (tx) => {
    const [b] = await tx<{ userId: number; status: string }[]>`
      SELECT user_id, status FROM bounties WHERE id = ${bountyId} AND expires_at > now() FOR UPDATE`;
    if (!b || b.status !== "open") throw new BountyError("마감된 수배예요");
    if (b.userId === userId) throw new BountyError("내 수배에는 참여할 수 없어요");
    const res = await tx`
      INSERT INTO bounty_participants (bounty_id, user_id) VALUES (${bountyId}, ${userId}) ON CONFLICT DO NOTHING`;
    if (res.count) await tx`UPDATE bounties SET participant_count = participant_count + 1 WHERE id = ${bountyId}`;
    return res.count > 0;
  });
}

/** 현상금 올리기 (참여자가 포인트 추가) */
export async function fundBounty(bountyId: number, userId: number, amount: number) {
  if (amount < BOUNTY_POLICY.minFund) throw new BountyError(`${BOUNTY_POLICY.minFund}P 이상부터 올릴 수 있어요`);
  return sql.begin(async (tx) => {
    const [b] = await tx<{ status: string; title: string }[]>`
      SELECT status, title FROM bounties WHERE id = ${bountyId} AND expires_at > now() FOR UPDATE`;
    if (!b || b.status !== "open") throw new BountyError("마감된 수배예요");
    await debit(tx, userId, amount, "bounty_fund", `현상금 추가: ${b.title}`);
    const ins = await tx`
      INSERT INTO bounty_participants (bounty_id, user_id, contributed) VALUES (${bountyId}, ${userId}, ${amount})
      ON CONFLICT (bounty_id, user_id) DO UPDATE SET contributed = bounty_participants.contributed + EXCLUDED.contributed
      RETURNING (xmax = 0) AS inserted`;
    const inserted = (ins[0] as unknown as { inserted: boolean }).inserted;
    const [{ pot }] = await tx<{ pot: number }[]>`
      UPDATE bounties SET pot = pot + ${amount}, participant_count = participant_count + ${inserted ? 1 : 0}
      WHERE id = ${bountyId} RETURNING pot`;
    return pot;
  });
}

export class BountyError extends Error {}

/**
 * 현상금 지급: 채택된 발견 상품의 헌터에게 현상금(수수료 제외) 지급.
 * 수배자 채택 또는 마감 시 자동 채택에서 호출.
 */
export async function awardBounty(bountyId: number, dealId: number) {
  const result = await sql.begin(async (tx) => {
    const [b] = await tx<{ status: string; pot: number; title: string }[]>`
      SELECT status, pot, title FROM bounties WHERE id = ${bountyId} FOR UPDATE`;
    if (!b || b.status !== "open") throw new BountyError("이미 종료된 수배예요");
    const [d] = await tx<{ userId: number }[]>`SELECT user_id FROM deals WHERE id = ${dealId} AND bounty_id = ${bountyId}`;
    if (!d) throw new BountyError("이 수배의 발견 상품이 아니에요");
    const prize = Math.floor(b.pot * (1 - BOUNTY_POLICY.platformFeeRate));
    await credit(tx, d.userId, prize, "bounty_prize", `현상금 획득: ${b.title}`, `bounty:${bountyId}`);
    await tx`UPDATE bounties SET status = 'awarded', awarded_deal_id = ${dealId}, updated_at = now() WHERE id = ${bountyId}`;
    await tx`
      INSERT INTO notifications (user_id, deal_id, kind, title, body)
      VALUES (${d.userId}, ${dealId}, 'reward', ${`현상금 ${prize.toLocaleString()}P를 받았어요`}, ${b.title})`;
    return { hunterId: d.userId, prize, title: b.title };
  });
  await pushToUsers([result.hunterId], {
    title: `현상금 ${result.prize.toLocaleString()}P를 받았어요`,
    body: result.title,
    url: `${env.siteUrl}/bounties/${bountyId}`,
  }).catch(() => {});
  return result;
}

/** 마감 처리: 기준 이상 평가받은 발견 상품이 있으면 자동 채택, 없으면 건 포인트 전액 환불 */
export async function settleExpiredBounties() {
  const expired = await sql<{ id: number }[]>`
    SELECT id FROM bounties WHERE status = 'open' AND expires_at <= now() ORDER BY id LIMIT 200`;
  let awarded = 0;
  let refunded = 0;
  for (const { id } of expired) {
    const [best] = await sql<{ id: number; score: number }[]>`
      SELECT id, votes_up - votes_down AS score FROM deals
      WHERE bounty_id = ${id} AND status <> 'hidden' ORDER BY votes_up - votes_down DESC, price ASC NULLS LAST LIMIT 1`;
    try {
      if (best && best.score >= BOUNTY_POLICY.autoAwardMinScore) {
        await awardBounty(id, best.id);
        awarded++;
      } else {
        await refundBounty(id);
        refunded++;
      }
    } catch (e) {
      console.error("settle bounty failed", id, e);
    }
  }
  return { awarded, refunded };
}

async function refundBounty(bountyId: number) {
  await sql.begin(async (tx) => {
    const [b] = await tx<{ userId: number; stake: number; title: string; status: string }[]>`
      SELECT user_id, stake, title, status FROM bounties WHERE id = ${bountyId} FOR UPDATE`;
    if (!b || b.status !== "open") return;
    await credit(tx, b.userId, b.stake, "bounty_refund", `수배 마감 환불: ${b.title}`, `bounty:${bountyId}:stake`);
    const funders = await tx<{ userId: number; contributed: number }[]>`
      SELECT user_id, contributed FROM bounty_participants WHERE bounty_id = ${bountyId} AND contributed > 0`;
    for (const f of funders) {
      await credit(tx, f.userId, f.contributed, "bounty_refund", `수배 마감 환불: ${b.title}`, `bounty:${bountyId}:fund`);
    }
    await tx`UPDATE bounties SET status = 'expired', updated_at = now() WHERE id = ${bountyId}`;
  });
}

/** 발견 상품 등록 시: 수배자 + 참여자 전원에게 "찾았다" 알림 */
export async function notifyBountyFound(bountyId: number, dealId: number, hunterId: number, price: number | null) {
  const [b] = await sql<{ userId: number; title: string }[]>`SELECT user_id, title FROM bounties WHERE id = ${bountyId}`;
  if (!b) return;
  const watchers = await sql<{ userId: number }[]>`
    SELECT ${b.userId}::bigint AS user_id
    UNION SELECT user_id FROM bounty_participants WHERE bounty_id = ${bountyId}`;
  const ids = watchers.map((w) => w.userId).filter((id) => id !== hunterId);
  if (!ids.length) return;
  const title = `'${b.title}' 수배 상품이 올라왔어요${price ? ` · ${price.toLocaleString("ko-KR")}원` : ""}`;
  await sql`
    INSERT INTO notifications (user_id, deal_id, kind, title, body)
    SELECT unnest(${ids}::bigint[]), ${dealId}, 'bounty_found', ${title}, '찾은 상품을 확인하고 평가해주세요'`;
  await pushToUsers(ids, { title, body: "찾은 상품을 확인하고 평가해주세요", url: `${env.siteUrl}/bounties/${bountyId}`, tag: `bounty-${bountyId}` });
}
