import type postgres from "postgres";
import { sql } from "./db";
import { merchantById } from "./affiliate/merchants";

type Tx = postgres.TransactionSql | postgres.Sql;

/**
 * 줍줍 포인트 정책 (1P 가치는 CASHOUT_RATE 로 원화 환산).
 *
 * ① 구매 기여 포인트 — 실제로 확정된 구매 수수료를 기여자에게 나눈다. 상한 없음.
 *    - 헌터(딜을 찾아 올린 사람):     수수료의 30%
 *    - 공유자(그 공유 링크로 구매):    수수료의 20%
 *    - 수배자(수배지에서 발견된 딜):  수수료의 10% — 수배가 인기를 끌어 구매자가 늘수록 비례해서 증가
 *    - 초대자: 초대한 친구가 받은 ①의 10% 를 플랫폼 몫에서 추가 지급 (1단계만)
 * ② 활동 포인트 — 참여·댓글·평가·공유유입. 플랫폼 예산이라 어뷰징 방지를 위해 하루 상한을 둔다.
 * ③ 현상금 — 수배자·참여자가 건 포인트. 채택된 헌터가 가져간다(수수료 10% 제외).
 */
export const REWARD_POLICY = {
  hunterRate: 0.3,
  sharerRate: 0.2,
  bountyPosterRate: 0.1,
  referralRate: 0.1,
} as const;

export const ACTIVITY_POINTS = {
  join: 5, //        수배 참여 ("나도 찾아요") — 수배당 1회
  comment: 3, //     댓글
  vote: 2, //        딜/발견상품 평가 — 딜당 1회
  shareArrival: 10, // 내 공유 링크로 실제 방문자 유입 — 방문자·대상·하루당 1회
  hunt: 20, //       수배 상품 발견 등록 — 수배당 1회
} as const;
export const DAILY_ACTIVITY_CAP = 300;

export const BOUNTY_POLICY = {
  minStake: 300,
  minFund: 50,
  maxDays: 14,
  platformFeeRate: 0.1, // 현상금 지급 시 수수료
  autoAwardMinScore: 3, // 마감 시 자동 채택 최소 순추천
} as const;

export const SIGNUP_BONUS = Number(process.env.SIGNUP_BONUS_POINTS ?? 1000);
export const CASHOUT = {
  /** 1P 당 원화 */
  rate: Number(process.env.CASHOUT_RATE ?? 1),
  minPoints: Number(process.env.CASHOUT_MIN_POINTS ?? 10000),
};

export type RewardKind = "hunter_reward" | "share_reward" | "bounty_reward";

export interface RewardInput {
  commission: number;
  hunterId: number;
  sharerId: number | null;
  buyerId: number | null;
  bountyPosterId: number | null;
  rewardEligible: boolean;
}

export interface RewardLine {
  userId: number;
  delta: number;
  kind: RewardKind;
}

/** 순수 함수: 확정 수수료 → 역할별 포인트 라인. 본인 구매분은 본인 몫에서 제외(셀프 구매 방지) */
export function splitCommission(i: RewardInput): RewardLine[] {
  if (!i.rewardEligible || i.commission <= 0) return [];
  const lines: RewardLine[] = [];
  const add = (userId: number | null, rate: number, kind: RewardKind) => {
    if (userId && userId !== i.buyerId) lines.push({ userId, delta: Math.floor(i.commission * rate), kind });
  };
  add(i.hunterId, REWARD_POLICY.hunterRate, "hunter_reward");
  add(i.sharerId, REWARD_POLICY.sharerRate, "share_reward");
  add(i.bountyPosterId, REWARD_POLICY.bountyPosterRate, "bounty_reward");
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
 * subId = clicks.id → 딜(헌터) / 공유자 / 구매자 / 수배자를 찾아 포인트 원장에 기록한다.
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

    const [deal] = await tx<{ userId: number; merchant: string; bountyPosterId: number | null }[]>`
      SELECT d.user_id, d.merchant, b.user_id AS bounty_poster_id
      FROM deals d LEFT JOIN bounties b ON b.id = d.bounty_id WHERE d.id = ${click.dealId}`;
    if (!deal) return { conversionId: conv.id, rewards: 0 };

    const lines = splitCommission({
      commission: r.commission,
      hunterId: deal.userId,
      sharerId: click.sharerId,
      buyerId: click.userId,
      bountyPosterId: deal.bountyPosterId,
      rewardEligible: merchantById(deal.merchant).rewardEligible,
    });

    for (const l of lines) {
      await tx`
        INSERT INTO points_ledger (user_id, delta, kind, status, conversion_id, memo)
        VALUES (${l.userId}, ${l.delta}, ${l.kind}, 'pending', ${conv.id}, ${`구매 확정 대기 · 주문 ${r.externalId}`})
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

async function recomputeBalances(tx: Tx, conversionId: number) {
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

/**
 * 즉시 지급 포인트. refKey 가 있으면 같은 (사용자, 종류, refKey) 로 두 번 지급되지 않는다.
 * @returns 실제 지급 여부
 */
export async function credit(tx: Tx, userId: number, delta: number, kind: string, memo: string, refKey?: string) {
  const res = await tx`
    INSERT INTO points_ledger (user_id, delta, kind, status, memo, ref_key)
    VALUES (${userId}, ${delta}, ${kind}, 'available', ${memo}, ${refKey ?? null})
    ON CONFLICT (user_id, kind, ref_key) WHERE ref_key IS NOT NULL DO NOTHING`;
  if (!res.count) return false;
  await tx`UPDATE users SET points_available = points_available + ${delta} WHERE id = ${userId}`;
  return true;
}

export class InsufficientPointsError extends Error {
  constructor() {
    super("포인트가 부족해요");
  }
}

/** 포인트 차감 (잔액 부족 시 예외) — 반드시 트랜잭션 안에서 호출 */
export async function debit(tx: Tx, userId: number, amount: number, kind: string, memo: string) {
  const res = await tx`
    UPDATE users SET points_available = points_available - ${amount}
    WHERE id = ${userId} AND points_available >= ${amount}`;
  if (!res.count) throw new InsufficientPointsError();
  await tx`
    INSERT INTO points_ledger (user_id, delta, kind, status, memo)
    VALUES (${userId}, ${-amount}, ${kind}, 'available', ${memo})`;
}

/** 활동 포인트 지급: 하루 상한(KST) 안에서만 지급, refKey 로 중복 방지 */
export async function grantActivity(
  userId: number,
  action: keyof typeof ACTIVITY_POINTS,
  refKey: string,
  memo: string,
): Promise<number> {
  const amount = ACTIVITY_POINTS[action];
  return sql.begin(async (tx) => {
    // 동시 요청이 상한을 넘지 않도록 사용자 행 잠금
    await tx`SELECT 1 FROM users WHERE id = ${userId} FOR UPDATE`;
    const [{ today }] = await tx<{ today: number }[]>`
      SELECT COALESCE(sum(delta), 0)::int AS today FROM points_ledger
      WHERE user_id = ${userId} AND kind = 'activity'
        AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`;
    const give = Math.min(amount, DAILY_ACTIVITY_CAP - today);
    if (give <= 0) return 0;
    return (await credit(tx, userId, give, "activity", memo, `${action}:${refKey}`)) ? give : 0;
  });
}

/** (호환) 즉시 지급 */
export async function grantPoints(userId: number, delta: number, kind: string, memo: string) {
  await sql.begin((tx) => credit(tx, userId, delta, kind, memo));
}
