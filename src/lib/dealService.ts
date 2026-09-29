import { z } from "zod";
import { after } from "next/server";
import { sql } from "./db";
import { prepareLink, getNetworkBase } from "./affiliate";
import { fetchProductMeta } from "./scrape";
import { guessCategory, CATEGORY_IDS } from "./categories";
import { hotScore } from "./ranking";
import { notifyAlertMatches } from "./alerts";
import { XP } from "./levels";
import { invalidate } from "./cache";
import { BountyError, notifyBountyFound, refreshBountyScore } from "./bounties";
import { grantActivity } from "./rewards";

export const createDealSchema = z.object({
  url: z.string().min(8).max(2000),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  price: z.coerce.number().int().min(0).max(1_000_000_000).optional().nullable(),
  originalPrice: z.coerce.number().int().min(0).max(1_000_000_000).optional().nullable(),
  shipping: z.string().trim().max(40).optional().nullable(),
  imageUrl: z.string().url().max(1000).optional().nullable().or(z.literal("")),
  category: z.string().refine((c) => CATEGORY_IDS.includes(c)).optional(),
  endsAt: z.coerce.date().optional().nullable(),
  /** 수배지에 대한 발견 상품이면 수배 id */
  bountyId: z.coerce.number().int().positive().optional().nullable(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;

/** 링크 미리보기: 정규화 + 상품정보 + 중복 딜 확인 */
export async function previewLink(url: string) {
  const link = await prepareLink(url);
  const [meta, dup] = await Promise.all([
    fetchProductMeta(link.canonicalUrl),
    sql<{ id: number; title: string; price: number | null }[]>`
      SELECT id, title, price FROM deals
      WHERE canonical_url = ${link.canonicalUrl} AND status = 'active' AND created_at > now() - interval '7 days'
      ORDER BY id DESC LIMIT 1`,
  ]);
  return {
    canonicalUrl: link.canonicalUrl,
    merchant: { id: link.merchant.id, name: link.merchant.name },
    monetized: link.monetized,
    meta: { ...meta, category: guessCategory(meta.title ?? "", link.merchant.id) },
    duplicate: dup[0] ?? null,
  };
}

export async function createDeal(userId: number, input: CreateDealInput) {
  const link = await prepareLink(input.url);
  const createdAt = new Date();
  const score = hotScore({ votesUp: 0, votesDown: 0, clickCount: 0, shareCount: 0, commentCount: 0, createdAt });
  const category = input.category ?? guessCategory(input.title, link.merchant.id);

  const deal = await sql.begin(async (tx) => {
    if (input.bountyId) {
      const [b] = await tx<{ userId: number }[]>`
        SELECT user_id FROM bounties WHERE id = ${input.bountyId} AND status = 'open' AND expires_at > now() FOR UPDATE`;
      if (!b) throw new BountyError("마감된 수배예요");
      if (b.userId === userId) throw new BountyError("내 수배에는 직접 발견 상품을 올릴 수 없어요");
      const [dup] = await tx`SELECT 1 FROM deals WHERE bounty_id = ${input.bountyId} AND canonical_url = ${link.canonicalUrl}`;
      if (dup) throw new BountyError("이미 이 수배에 올라온 상품이에요");
    }
    const [d] = await tx<{ id: number }[]>`
      INSERT INTO deals (user_id, title, description, original_url, canonical_url, merchant, network, monetized,
                         image_url, price, original_price, shipping, category, ends_at, hot_score, created_at, bounty_id)
      VALUES (${userId}, ${input.title}, ${input.description ?? null}, ${link.originalUrl}, ${link.canonicalUrl},
              ${link.merchant.id}, ${link.network}, ${link.monetized}, ${input.imageUrl || null}, ${input.price ?? null},
              ${input.originalPrice ?? null}, ${input.shipping ?? null}, ${category}, ${input.endsAt ?? null},
              ${score}, ${createdAt}, ${input.bountyId ?? null})
      RETURNING id`;
    if (input.bountyId) await tx`UPDATE bounties SET found_count = found_count + 1 WHERE id = ${input.bountyId}`;
    if (input.price) {
      await tx`INSERT INTO price_history (canonical_url, price, deal_id) VALUES (${link.canonicalUrl}, ${input.price}, ${d.id})`;
    }
    await tx`UPDATE users SET xp = xp + ${XP.postDeal} WHERE id = ${userId}`;
    return d;
  });

  // 응답 이후 백그라운드: 제휴 딥링크 선생성 + 알림 매칭 + 피드 캐시 무효화
  after(async () => {
    if (link.monetized) await ensureAffiliateBase(link.canonicalUrl, link.network);
    await invalidate("feed:new:all:", `feed:new:${category}:`);
    await grantActivity(userId, "post", String(deal.id), "핫딜 공유").catch(() => 0);
    if (input.bountyId) {
      await refreshBountyScore(input.bountyId);
      await grantActivity(userId, "hunt", String(input.bountyId), "수배 상품 발견").catch(() => {});
      await notifyBountyFound(input.bountyId, deal.id, userId, input.price ?? null).catch((e) => console.error(e));
    }
    await notifyAlertMatches({
      id: deal.id,
      title: input.title,
      price: input.price ?? null,
      imageUrl: input.imageUrl || null,
      userId,
    }).catch((e) => console.error("alert match failed", e));
  });

  return deal.id;
}

/** API 기반 제휴 네트워크(쿠팡)의 딥링크를 캐시에서 가져오거나 생성 */
export async function ensureAffiliateBase(canonicalUrl: string, network: string) {
  const [hit] = await sql<{ affiliateUrl: string }[]>`
    SELECT affiliate_url FROM affiliate_link_cache WHERE canonical_url = ${canonicalUrl}`;
  if (hit) return hit.affiliateUrl;
  const base = await getNetworkBase(canonicalUrl, network as never);
  if (!base) return null;
  await sql`
    INSERT INTO affiliate_link_cache (canonical_url, network, affiliate_url) VALUES (${canonicalUrl}, ${network}, ${base})
    ON CONFLICT (canonical_url) DO NOTHING`;
  return base;
}
