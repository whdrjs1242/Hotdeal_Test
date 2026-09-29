import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, idParam, limit, parseBody, requireUser } from "@/lib/api";
import { sql } from "@/lib/db";
import { refreshHotScore } from "@/lib/deals";
import { XP } from "@/lib/levels";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const dealId = idParam((await params).id);
  await limit(`comment:${user.id}`, 10, 60);
  const { body } = await parseBody(req, z.object({ body: z.string().trim().min(1).max(500) }));
  const [c] = await sql<{ id: number; createdAt: string }[]>`
    WITH ins AS (
      INSERT INTO comments (deal_id, user_id, body)
      SELECT ${dealId}, ${user.id}, ${body} WHERE EXISTS (SELECT 1 FROM deals WHERE id = ${dealId})
      RETURNING id, created_at
    ), upd AS (
      UPDATE deals SET comment_count = comment_count + 1 WHERE id = ${dealId} AND EXISTS (SELECT 1 FROM ins)
    )
    SELECT * FROM ins`;
  if (!c) return NextResponse.json({ error: "없는 딜이에요" }, { status: 404 });
  await sql`UPDATE users SET xp = xp + ${XP.comment} WHERE id = ${user.id}`;
  await refreshHotScore(dealId);
  return NextResponse.json({ ...c, body, userId: user.id, nickname: user.nickname, xp: user.xp }, { status: 201 });
});
