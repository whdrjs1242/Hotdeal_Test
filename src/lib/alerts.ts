import { sql } from "./db";
import { env } from "./env";
import { pushToUsers } from "./push";

/**
 * 새 딜이 올라오면 "줍줍 알림"(키워드 + 목표가)과 매칭해 알림을 보낸다.
 * 알림 수가 수백만 단위가 되면 키워드 사전을 Aho-Corasick 워커로 분리한다(docs/ARCHITECTURE.md).
 */
export async function notifyAlertMatches(deal: { id: number; title: string; price: number | null; imageUrl: string | null; userId: number }) {
  const matches = await sql<{ userId: number; keyword: string }[]>`
    SELECT DISTINCT ON (user_id) user_id, keyword FROM alerts
    WHERE position(lower(keyword) IN lower(${deal.title})) > 0
      AND (max_price IS NULL OR (${deal.price}::int IS NOT NULL AND ${deal.price}::int <= max_price))
      AND user_id <> ${deal.userId}
    ORDER BY user_id, id
    LIMIT 50000`;
  if (!matches.length) return 0;

  const priceText = deal.price ? ` ${deal.price.toLocaleString("ko-KR")}원` : "";
  await sql`
    INSERT INTO notifications (user_id, deal_id, kind, title, body)
    SELECT x.user_id, ${deal.id}, 'alert_match', x.title, ${deal.title}
    FROM jsonb_to_recordset(${sql.json(
      matches.map((m) => ({ user_id: m.userId, title: `🔔 '${m.keyword}' 핫딜 등장!${priceText}` })),
    )}) AS x(user_id bigint, title text)`;

  await pushToUsers(
    matches.map((m) => m.userId),
    {
      title: `🔔 기다리던 핫딜이 떴어요${priceText}`,
      body: deal.title,
      url: `${env.siteUrl}/deals/${deal.id}`,
      image: deal.imageUrl,
      tag: `deal-${deal.id}`,
    },
  );
  return matches.length;
}
