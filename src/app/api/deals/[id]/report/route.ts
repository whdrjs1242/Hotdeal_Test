import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, idParam, limit, parseBody, requireUser } from "@/lib/api";
import { sql } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

const SOLDOUT_THRESHOLD = 3;
const HIDE_THRESHOLD = 5;

/** 크라우드 검증: 품절/가격변동 3건 → 자동 '종료' 표시, 스팸 5건 → 숨김 */
export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const dealId = idParam((await params).id);
  await limit(`report:${user.id}`, 30, 3600);
  const { reason } = await parseBody(req, z.object({ reason: z.enum(["soldout", "price_changed", "spam", "etc"]) }));
  const res = await sql`
    INSERT INTO reports (deal_id, user_id, reason) VALUES (${dealId}, ${user.id}, ${reason})
    ON CONFLICT DO NOTHING`;
  if (res.count) {
    await sql`UPDATE deals SET report_count = report_count + 1 WHERE id = ${dealId}`;
    const [{ ended, spam }] = await sql<{ ended: number; spam: number }[]>`
      SELECT count(*) FILTER (WHERE reason IN ('soldout','price_changed'))::int AS ended,
             count(*) FILTER (WHERE reason = 'spam')::int AS spam
      FROM reports WHERE deal_id = ${dealId}`;
    if (spam >= HIDE_THRESHOLD) await sql`UPDATE deals SET status = 'hidden' WHERE id = ${dealId}`;
    else if (ended >= SOLDOUT_THRESHOLD) await sql`UPDATE deals SET status = 'soldout' WHERE id = ${dealId} AND status = 'active'`;
  }
  return NextResponse.json({ ok: true });
});
