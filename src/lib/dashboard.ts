import { sql } from "./db";

export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

export interface DailyRow {
  day: string; // YYYY-MM-DD (KST)
  signups: number;
  referred: number;
  deals: number;
  clicks: number;
  shareClicks: number;
  shares: number;
  commission: number;
  orders: number;
}

export interface Totals {
  signups: number;
  referred: number;
  deals: number;
  clicks: number;
  shareClicks: number;
  shares: number;
  commission: number;
  orders: number;
}

/**
 * 운영 대시보드 데이터. 모든 지표는 같은 기간(KST 기준 최근 N일)으로 잘려 서로 맞아떨어진다.
 * 직전 동기간과의 비교(delta)를 위해 일별 시계열은 2N일을 조회해 둘로 나눈다.
 */
export async function loadDashboard(days: RangeDays) {
  const span = days * 2;
  const from = sql`(now() AT TIME ZONE 'Asia/Seoul')::date - ${span - 1}::int`;
  // KST 자정 기준 경계 (timestamptz)
  const fromTs = sql`((${from})::timestamp AT TIME ZONE 'Asia/Seoul')`;
  const since = sql`(((now() AT TIME ZONE 'Asia/Seoul')::date - ${days - 1}::int)::timestamp AT TIME ZONE 'Asia/Seoul')`;

  const [daily, byNetwork, byCategory, topDeals, topSharers, heat, points, [live], reported] = await Promise.all([
    sql<DailyRow[]>`
      WITH d AS (SELECT generate_series(${from}, (now() AT TIME ZONE 'Asia/Seoul')::date, interval '1 day')::date AS day)
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
        COALESCE(u.signups, 0)::int AS signups, COALESCE(u.referred, 0)::int AS referred,
        COALESCE(dl.deals, 0)::int AS deals,
        COALESCE(c.clicks, 0)::int AS clicks, COALESCE(c.share_clicks, 0)::int AS share_clicks,
        COALESCE(s.shares, 0)::int AS shares,
        COALESCE(cv.commission, 0)::int AS commission, COALESCE(cv.orders, 0)::int AS orders
      FROM d
      LEFT JOIN (SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, count(*) AS signups, count(referred_by) AS referred
                 FROM users WHERE created_at >= ${fromTs} GROUP BY 1) u USING (day)
      LEFT JOIN (SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, count(*) AS deals
                 FROM deals WHERE created_at >= ${fromTs} GROUP BY 1) dl USING (day)
      LEFT JOIN (SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, count(*) AS clicks, count(sharer_id) AS share_clicks
                 FROM clicks WHERE created_at >= ${fromTs} GROUP BY 1) c USING (day)
      LEFT JOIN (SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, count(*) AS shares
                 FROM shares WHERE created_at >= ${fromTs} GROUP BY 1) s USING (day)
      LEFT JOIN (SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, sum(commission) AS commission, count(*) AS orders
                 FROM conversions WHERE created_at >= ${fromTs} AND status <> 'canceled' GROUP BY 1) cv USING (day)
      ORDER BY d.day`,
    sql<{ network: string; clicks: number }[]>`
      SELECT network, count(*)::int AS clicks FROM clicks WHERE created_at >= ${since}
      GROUP BY network ORDER BY clicks DESC`,
    sql<{ category: string; deals: number; clicks: number }[]>`
      SELECT category, count(*)::int AS deals, COALESCE(sum(click_count), 0)::int AS clicks
      FROM deals WHERE created_at >= ${since} AND status <> 'hidden'
      GROUP BY category ORDER BY clicks DESC, deals DESC`,
    sql<{ id: number; title: string; merchant: string; status: string; clicks: number; votesUp: number; votesDown: number; price: number | null }[]>`
      SELECT d.id, d.title, d.merchant, d.status, c.clicks, d.votes_up, d.votes_down, d.price
      FROM (SELECT deal_id, count(*)::int AS clicks FROM clicks WHERE created_at >= ${since}
            GROUP BY deal_id ORDER BY clicks DESC LIMIT 8) c
      JOIN deals d ON d.id = c.deal_id ORDER BY c.clicks DESC`,
    sql<{ id: number; nickname: string; handle: string | null; clicks: number; visitors: number; invited: number }[]>`
      SELECT u.id, u.nickname, u.handle, c.clicks, c.visitors,
             (SELECT count(*)::int FROM users r WHERE r.referred_by = u.id AND r.created_at >= ${since}) AS invited
      FROM (SELECT sharer_id, count(*)::int AS clicks, count(DISTINCT ip_hash)::int AS visitors
            FROM clicks WHERE sharer_id IS NOT NULL AND created_at >= ${since}
            GROUP BY sharer_id ORDER BY visitors DESC LIMIT 8) c
      JOIN users u ON u.id = c.sharer_id ORDER BY c.visitors DESC`,
    sql<{ dow: number; hour: number; clicks: number }[]>`
      SELECT extract(isodow FROM created_at AT TIME ZONE 'Asia/Seoul')::int AS dow,
             extract(hour FROM created_at AT TIME ZONE 'Asia/Seoul')::int AS hour,
             count(*)::int AS clicks
      FROM clicks WHERE created_at >= ${since} GROUP BY 1, 2`,
    sql<{ kind: string; pending: number; available: number; canceled: number }[]>`
      SELECT kind,
             COALESCE(sum(delta) FILTER (WHERE status = 'pending'), 0)::int AS pending,
             COALESCE(sum(delta) FILTER (WHERE status = 'available'), 0)::int AS available,
             COALESCE(sum(delta) FILTER (WHERE status = 'canceled'), 0)::int AS canceled
      FROM points_ledger WHERE created_at >= ${since} GROUP BY kind ORDER BY kind`,
    sql<{ users: number; activeDeals: number; alerts: number; pushSubs: number; creators: number }[]>`
      SELECT (SELECT count(*)::int FROM users) AS users,
             (SELECT count(*)::int FROM deals WHERE status = 'active') AS active_deals,
             (SELECT count(*)::int FROM alerts) AS alerts,
             (SELECT count(*)::int FROM push_subscriptions) AS push_subs,
             (SELECT count(*)::int FROM users WHERE handle IS NOT NULL) AS creators`,
    sql<{ id: number; title: string; status: string; reportCount: number }[]>`
      SELECT id, title, status, report_count FROM deals WHERE report_count > 0 ORDER BY updated_at DESC LIMIT 12`,
  ]);

  const previous = daily.slice(0, daily.length - days);
  const current = daily.slice(-days);
  const sum = (rows: DailyRow[]): Totals => {
    const t: Totals = { signups: 0, referred: 0, deals: 0, clicks: 0, shareClicks: 0, shares: 0, commission: 0, orders: 0 };
    for (const r of rows) for (const k of Object.keys(t) as (keyof Totals)[]) t[k] += r[k];
    return t;
  };

  return {
    days,
    daily: current,
    totals: sum(current),
    prevTotals: sum(previous),
    byNetwork,
    byCategory,
    topDeals,
    topSharers,
    heat,
    points,
    live,
    reported,
  };
}

export type Dashboard = Awaited<ReturnType<typeof loadDashboard>>;

/** 직전 기간 대비 변화율(%). 이전 값이 0이면 null */
export function deltaPct(cur: number, prev: number) {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}
