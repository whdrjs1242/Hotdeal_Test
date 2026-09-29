import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, idParam, limit, parseBody, requireUser } from "@/lib/api";
import { sql } from "@/lib/db";
import { refreshBountyScore } from "@/lib/bounties";
import { grantActivity } from "@/lib/rewards";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const id = idParam((await params).id);
  await limit(`bcomment:${user.id}`, 10, 60);
  const { body } = await parseBody(req, z.object({ body: z.string().trim().min(1).max(500) }));
  const [c] = await sql<{ id: number; createdAt: string }[]>`
    WITH ins AS (
      INSERT INTO bounty_comments (bounty_id, user_id, body)
      SELECT ${id}, ${user.id}, ${body} WHERE EXISTS (SELECT 1 FROM bounties WHERE id = ${id})
      RETURNING id, created_at
    ), upd AS (
      UPDATE bounties SET comment_count = comment_count + 1 WHERE id = ${id} AND EXISTS (SELECT 1 FROM ins)
    )
    SELECT * FROM ins`;
  if (!c) return NextResponse.json({ error: "없는 수배예요" }, { status: 404 });
  await refreshBountyScore(id);
  const points = await grantActivity(user.id, "comment", `b${c.id}`, "수배 댓글 참여").catch(() => 0);
  return NextResponse.json({ ...c, body, userId: user.id, nickname: user.nickname, xp: user.xp, points }, { status: 201 });
});
