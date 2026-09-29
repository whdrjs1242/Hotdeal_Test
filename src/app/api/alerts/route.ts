import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { sql } from "@/lib/db";

const MAX_ALERTS = 30;

export const GET = handler(async () => {
  const user = await requireUser();
  const items = await sql`SELECT id, keyword, max_price FROM alerts WHERE user_id = ${user.id} ORDER BY id DESC`;
  return NextResponse.json({ items });
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`alert:${user.id}`, 30, 3600);
  const { keyword, maxPrice } = await parseBody(
    req,
    z.object({
      keyword: z.string().trim().min(2).max(30),
      maxPrice: z.coerce.number().int().positive().max(1_000_000_000).optional().nullable(),
    }),
  );
  const [{ count }] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM alerts WHERE user_id = ${user.id}`;
  if (count >= MAX_ALERTS) return NextResponse.json({ error: `알림은 최대 ${MAX_ALERTS}개까지 가능해요` }, { status: 400 });
  const [item] = await sql`
    INSERT INTO alerts (user_id, keyword, max_price) VALUES (${user.id}, ${keyword}, ${maxPrice ?? null})
    ON CONFLICT (user_id, keyword) DO UPDATE SET max_price = EXCLUDED.max_price
    RETURNING id, keyword, max_price`;
  return NextResponse.json(item, { status: 201 });
});

export const DELETE = handler(async (req) => {
  const user = await requireUser();
  const id = Number(req.nextUrl.searchParams.get("id"));
  await sql`DELETE FROM alerts WHERE id = ${id} AND user_id = ${user.id}`;
  return NextResponse.json({ ok: true });
});
