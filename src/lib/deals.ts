import { sql } from "./db";
import { HOT_SCORE_SQL } from "./ranking";

export interface DealCard {
  id: number;
  title: string;
  imageUrl: string | null;
  price: number | null;
  originalPrice: number | null;
  shipping: string | null;
  merchant: string;
  category: string;
  status: string;
  endsAt: string | null;
  votesUp: number;
  votesDown: number;
  commentCount: number;
  clickCount: number;
  shareCount: number;
  createdAt: string;
  userId: number;
  nickname: string;
  userXp: number;
  bountyId: number | null;
}

export interface DealDetail extends DealCard {
  description: string | null;
  canonicalUrl: string;
  network: string;
  monetized: boolean;
  handle: string | null;
}

export type SortKey = "hot" | "new" | "ending" | "top";

export interface ListParams {
  sort?: SortKey;
  category?: string;
  cursor?: string | null;
  q?: string | null;
  userId?: number;
  limit?: number;
}

const CARD_COLS = sql`
  d.id, d.title, d.image_url, d.price, d.original_price, d.shipping, d.merchant, d.category, d.status,
  d.ends_at, d.votes_up, d.votes_down, d.comment_count, d.click_count, d.share_count, d.created_at,
  d.user_id, u.nickname, u.xp AS user_xp, d.bounty_id`;

/** 커서 기반 페이지네이션 피드. OFFSET을 쓰지 않아 깊은 페이지도 인덱스 범위 스캔으로 끝난다. */
export async function listDeals(p: ListParams): Promise<{ items: DealCard[]; nextCursor: string | null }> {
  const limit = Math.min(p.limit ?? 20, 50);
  const sort = p.sort ?? "hot";
  const cat = p.category && p.category !== "all" ? p.category : null;
  const q = p.q?.trim() ? p.q.trim().slice(0, 50) : null;
  const [c1, c2] = (p.cursor ?? "").split("_");
  const hasCursor = Boolean(p.cursor && c2);

  const where = sql`
    d.status ${sort === "top" ? sql`IN ('active','soldout','expired')` : sql`= 'active'`}
    ${cat ? sql`AND d.category = ${cat}` : sql``}
    ${q ? sql`AND d.title ILIKE ${"%" + q.replace(/[%_\\]/g, "\\$&") + "%"}` : sql``}
    ${p.userId ? sql`AND d.user_id = ${p.userId}` : sql``}`;

  let rows: (DealCard & { hotScore: number })[];
  if (sort === "new") {
    rows = await sql`
      SELECT ${CARD_COLS}, d.hot_score FROM deals d JOIN users u ON u.id = d.user_id
      WHERE ${where} ${hasCursor ? sql`AND d.id < ${Number(c2)}` : sql``}
      ORDER BY d.id DESC LIMIT ${limit + 1}`;
  } else if (sort === "ending") {
    rows = await sql`
      SELECT ${CARD_COLS}, d.hot_score FROM deals d JOIN users u ON u.id = d.user_id
      WHERE ${where} AND d.ends_at > now()
      ${hasCursor ? sql`AND (d.ends_at, d.id) > (${new Date(Number(c1))}, ${Number(c2)})` : sql``}
      ORDER BY d.ends_at, d.id LIMIT ${limit + 1}`;
  } else if (sort === "top") {
    // 오늘의 TOP: 24시간 내 추천순
    rows = await sql`
      SELECT ${CARD_COLS}, d.hot_score FROM deals d JOIN users u ON u.id = d.user_id
      WHERE ${where} AND d.created_at > now() - interval '24 hours'
      ORDER BY (d.votes_up - d.votes_down) DESC, d.id DESC LIMIT ${limit}`;
    return { items: rows, nextCursor: null };
  } else {
    rows = await sql`
      SELECT ${CARD_COLS}, d.hot_score FROM deals d JOIN users u ON u.id = d.user_id
      WHERE ${where} ${hasCursor ? sql`AND (d.hot_score, d.id) < (${Number(c1)}, ${Number(c2)})` : sql``}
      ORDER BY d.hot_score DESC, d.id DESC LIMIT ${limit + 1}`;
  }
  const more = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor = !more || !last
    ? null
    : sort === "new"
      ? `0_${last.id}`
      : sort === "ending"
        ? `${new Date(last.endsAt!).getTime()}_${last.id}`
        : `${last.hotScore}_${last.id}`;
  return { items: items.map(({ hotScore: _h, ...rest }) => rest as DealCard), nextCursor };
}

export async function getDeal(id: number): Promise<DealDetail | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const [d] = await sql<DealDetail[]>`
    SELECT ${CARD_COLS}, d.description, d.canonical_url, d.network, d.monetized, u.handle
    FROM deals d JOIN users u ON u.id = d.user_id
    WHERE d.id = ${id} AND d.status <> 'hidden'`;
  return d ?? null;
}

export async function refreshHotScore(dealId: number) {
  await sql.unsafe(`UPDATE deals SET hot_score = ${HOT_SCORE_SQL}, updated_at = now() WHERE id = $1`, [dealId]);
}

export async function getPriceHistory(canonicalUrl: string) {
  return sql<{ price: number; observedAt: string }[]>`
    SELECT price, observed_at FROM price_history
    WHERE canonical_url = ${canonicalUrl}
    ORDER BY observed_at DESC LIMIT 30`;
}

export async function getComments(dealId: number) {
  return sql<{ id: number; body: string; createdAt: string; userId: number; nickname: string; xp: number }[]>`
    SELECT c.id, c.body, c.created_at, c.user_id, u.nickname, u.xp
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.deal_id = ${dealId} ORDER BY c.id LIMIT 300`;
}

export async function getMyVote(dealId: number, userId: number) {
  const [v] = await sql<{ value: number }[]>`SELECT value FROM deal_votes WHERE deal_id = ${dealId} AND user_id = ${userId}`;
  return v?.value ?? 0;
}

export async function addXp(userId: number, amount: number) {
  if (amount) await sql`UPDATE users SET xp = xp + ${amount} WHERE id = ${userId}`;
}
