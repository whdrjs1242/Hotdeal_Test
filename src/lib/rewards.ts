import type postgres from "postgres";
import { sql } from "./db";
import { merchantById } from "./affiliate/merchants";

/**
 * 수익 공유 정책. 제휴 수수료(원) 기준.
 * - 공유자: 자기 공유 링크로 들어온 구매 수수료의 30%
 * - 게시자: 자기가 올린 딜에서 발생한 모든 구매 수수료의 20%
 * - 초대자: 초대한 친구가 받은 리워드의 10% 를 플랫폼 몫에서 추가 지급 (1단계만 — 다단계 금지)
 * 나머지는 플랫폼 몫. 구매확정(confirmed) 전까지는 pending 포인트.
 */
export const REWARD_POLICY = {
  sharerRate: 0.3,
  posterRate: 0.2,
  referralRate: 0.1,
  minWithdraw: 5000,
} as const;

export interface RewardInput {
  commission: number;
  posterId: number;
  sharerId: number | null;
  buyerId: number | null;
  rewardEligible: boolean;
}

export interface RewardLine {
  userId: number;
  delta: number;
  kind: "share_reward" | "post_reward";
}

/** 순수 함수: 수수료 → 사용자별 리워드 라인 */
export function splitCommission(i: RewardInput): RewardLine[] {
  if (!i.rewardEligible || i.commission <= 0) return [];
  const lines: RewardLine[] = [];
  // 자기 링크로 자기가 산 경우(셀프 구매)는 공유 리워드 제외 — 캐시백 어뷰징 방지
  if (i.sharerId && i.sharerId !== i.buyerId) {
    lines.push({ userId: i.sharerId, delta: Math.floor(i.commission * REWARD_POLICY.sharerRate), kind: "share_reward" });
  }
  if (i.posterId !== i.buyerId) {
    lines.push({ userId: i.posterId, delta: Math.floor(i.commission * REWARD_POLICY.posterRate), kind: "post_reward" });
  }
  return lines.filter((l) => l.delta > 0);
}

export interface ConversionReport {
  network: string;
  externalId: string;
  subId: string | null;
  orderAmount: number;
  commission: number;
  status: "pending" | "confirmed" | "canceled";
  orderedAt?: Date;
  raw?: unknown;
}

/**
 * 제휴사 실적 한 건 반영 (멱등). CSV 업로드 또는 제휴사 API 폴링에서 호출.
 * subId = clicks.id → 딜/공유자/구매자를 찾아 포인트 원장에 기록한다.
 */
export async function ingestConversion(r: ConversionReport) {
  return sql.begin(async (tx) => {
    const clickId = r.subId && /^\d+$/.test(r.subId) ? Number(r.subId) : null;
    const click = clickId
      ? (
          await tx<{ id: number; dealId: number; userId: number | null; sharerId: number | null }[]>`
            SELECT id, deal_id, user_id, sharer_id FROM clicks WHERE id = ${clickId}`
        )[0]
      : undefined;

    const [conv] = await tx<{ id: number }[]>`
      INSERT INTO conversions (network, external_id, click_id, order_amount, commission, status, ordered_at, raw)
      VALUES (${r.network}, ${r.externalId}, ${click?.id ?? null}, ${r.orderAmount}, ${r.commission}, ${r.status},
              ${r.orderedAt ?? null}, ${r.raw ? tx.json(r.raw as postgres.JSONValue) : null})
      ON CONFLICT (network, external_id) DO UPDATE
        SET status = EXCLUDED.status, commission = EXCLUDED.commission, order_amount = EXCLUDED.order_amount, updated_at = now()
      RETURNING id`;

    if (!click) return { conversionId: conv.id, rewards: 0 };

    const [deal] = await tx<{ userId: number; merchant: string }[]>`SELECT user_id, merchant FROM deals WHERE id = ${click.dealId}`;
    if (!deal) return { conversionId: conv.id, rewards: 0 };

    const lines = splitCommission({
      commission: r.commission,
      posterId: deal.userId,
      sharerId: click.sharerId,
      buyerId: click.userId,
      rewardEligible: merchantById(deal.merchant).rewardEligible,
    });

    // 원장 생성 (중복 방지 unique index) — 이미 있으면 상태만 전이
    for (const l of lines) {
      await tx`
        INSERT INTO points_ledger (user_id, delta, kind, status, conversion_id, memo)
        VALUES (${l.userId}, ${l.delta}, ${l.kind}, 'pending', ${conv.id}, ${`주문 ${r.externalId}`})
        ON CONFLICT (conversion_id, user_id, kind) WHERE conversion_id IS NOT NULL DO NOTHING`;
      const [ref] = await tx<{ referredBy: number | null }[]>`SELECT referred_by FROM users WHERE id = ${l.userId}`;
      const bonus = Math.floor(l.delta * REWARD_POLICY.referralRate);
      if (ref?.referredBy && bonus > 0) {
        await tx`
          INSERT INTO points_ledger (user_id, delta, kind, status, conversion_id, memo)
          VALUES (${ref.referredBy}, ${bonus}, 'referral_reward', 'pending', ${conv.id}, '초대한 친구 활동 보너스')
          ON CONFLICT (conversion_id, user_id, kind) WHERE conversion_id IS NOT NULL DO NOTHING`;
      }
    }

    const target = r.status === "confirmed" ? "available" : r.status === "canceled" ? "canceled" : "pending";
    // pending → available/canceled, 구매확정 후 환불(available → canceled)도 반영
    await tx`
      UPDATE points_ledger SET status = ${target}
      WHERE conversion_id = ${conv.id} AND status <> 'canceled' AND status <> ${target}`;
    await recomputeBalances(tx, conv.id);
    return { conversionId: conv.id, rewards: lines.length };
  });
}

async function recomputeBalances(tx: postgres.TransactionSql, conversionId: number) {
  await tx`
    UPDATE users u SET
      points_available = COALESCE(s.available, 0),
      points_pending   = COALESCE(s.pending, 0)
    FROM (
      SELECT user_id,
             SUM(delta) FILTER (WHERE status = 'available') AS available,
             SUM(delta) FILTER (WHERE status = 'pending')   AS pending
      FROM points_ledger
      WHERE user_id IN (SELECT user_id FROM points_ledger WHERE conversion_id = ${conversionId})
      GROUP BY user_id
    ) s
    WHERE u.id = s.user_id`;
}

/** 즉시 지급 포인트(출석 등). 원장 + 캐시 동시 갱신 */
export async function grantPoints(userId: number, delta: number, kind: string, memo: string) {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO points_ledger (user_id, delta, kind, status, memo) VALUES (${userId}, ${delta}, ${kind}, 'available', ${memo})`;
    await tx`UPDATE users SET points_available = points_available + ${delta} WHERE id = ${userId}`;
  });
}
