import { sql } from "./db";
import { debit, credit } from "./rewards";
import { encrypt } from "./crypto";

export interface ShopItem {
  id: number;
  kind: "giftcard" | "product" | "cosmetic";
  slot: string | null;
  itemKey: string | null;
  name: string;
  description: string | null;
  image: string | null;
  rarity: string;
  pricePoints: number | null;
  stock: number | null;
  maxPerUserMonth: number | null;
}

export class MarketError extends Error {}

export const RARITY = {
  common: { label: "일반", color: "#898781" },
  rare: { label: "레어", color: "#2a78d6" },
  epic: { label: "에픽", color: "#4a3aa7" },
  legendary: { label: "전설", color: "#c98500" },
} as const;

export async function listShopItems() {
  return sql<ShopItem[]>`
    SELECT id, kind, slot, item_key, name, description, image, rarity, price_points, stock, max_per_user_month
    FROM shop_items WHERE active ORDER BY sort, id`;
}

export async function ownedItemIds(userId: number) {
  const rows = await sql<{ itemId: number }[]>`SELECT item_id FROM user_items WHERE user_id = ${userId}`;
  return new Set(rows.map((r) => r.itemId));
}

/**
 * 포인트로 구매. 꾸미기는 즉시 지급, 상품권·실물은 주문 접수 후 운영자가 발송.
 * 재고/월 구매 한도/잔액을 한 트랜잭션에서 확인한다.
 */
export async function buyItem(userId: number, itemId: number, contact?: string | null) {
  return sql.begin(async (tx) => {
    const [item] = await tx<ShopItem[]>`
      SELECT id, kind, slot, item_key, name, price_points, stock, max_per_user_month
      FROM shop_items WHERE id = ${itemId} AND active FOR UPDATE`;
    if (!item || item.pricePoints == null) throw new MarketError("구매할 수 없는 상품이에요");
    if (item.stock != null && item.stock <= 0) throw new MarketError("품절됐어요");
    if (item.kind === "cosmetic") {
      const [owned] = await tx`SELECT 1 FROM user_items WHERE user_id = ${userId} AND item_id = ${itemId}`;
      if (owned) throw new MarketError("이미 가지고 있어요");
    } else {
      if (!contact || contact.trim().length < 9) throw new MarketError("받으실 연락처를 입력해주세요");
      if (item.maxPerUserMonth != null) {
        const [{ n }] = await tx<{ n: number }[]>`
          SELECT count(*)::int AS n FROM orders
          WHERE user_id = ${userId} AND item_id = ${itemId} AND status <> 'canceled'
            AND created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'`;
        if (n >= item.maxPerUserMonth) throw new MarketError(`이 상품은 한 달에 ${item.maxPerUserMonth}번까지 교환할 수 있어요`);
      }
    }
    await debit(tx, userId, item.pricePoints, "market", `마켓 교환: ${item.name}`);
    if (item.stock != null) await tx`UPDATE shop_items SET stock = stock - 1 WHERE id = ${itemId}`;
    const isCosmetic = item.kind === "cosmetic";
    const [order] = await tx<{ id: number }[]>`
      INSERT INTO orders (user_id, item_id, price_points, status, contact_enc, fulfilled_at)
      VALUES (${userId}, ${itemId}, ${item.pricePoints}, ${isCosmetic ? "fulfilled" : "requested"},
              ${contact ? encrypt(contact.trim()) : null}, ${isCosmetic ? new Date() : null})
      RETURNING id`;
    if (isCosmetic) {
      await tx`INSERT INTO user_items (user_id, item_id, source) VALUES (${userId}, ${itemId}, 'shop')`;
    }
    return { orderId: order.id, item };
  });
}

/** 운영자: 발송 완료(쿠폰번호/송장 입력) 또는 취소(포인트·재고 복원) */
export async function settleOrder(orderId: number, action: "fulfill" | "cancel", delivery?: string, memo?: string) {
  return sql.begin(async (tx) => {
    const [o] = await tx<{ userId: number; itemId: number; pricePoints: number; status: string; name: string }[]>`
      SELECT o.user_id, o.item_id, o.price_points, o.status, i.name
      FROM orders o JOIN shop_items i ON i.id = o.item_id WHERE o.id = ${orderId} FOR UPDATE`;
    if (!o || o.status !== "requested") throw new MarketError("이미 처리된 주문이에요");
    if (action === "fulfill") {
      await tx`
        UPDATE orders SET status = 'fulfilled', delivery_enc = ${delivery ? encrypt(delivery) : null}, memo = ${memo ?? null},
               fulfilled_at = now() WHERE id = ${orderId}`;
      await tx`
        INSERT INTO notifications (user_id, kind, title, body)
        VALUES (${o.userId}, 'market', ${`🎁 ${o.name} 발송 완료`}, 'MY > 교환 내역에서 확인하세요')`;
    } else {
      await tx`UPDATE orders SET status = 'canceled', memo = ${memo ?? null}, fulfilled_at = now() WHERE id = ${orderId}`;
      await tx`UPDATE shop_items SET stock = stock + 1 WHERE id = ${o.itemId} AND stock IS NOT NULL`;
      await credit(tx, o.userId, o.pricePoints, "market_refund", `교환 취소: ${o.name}${memo ? ` (${memo})` : ""}`, `order:${orderId}`);
    }
  });
}
