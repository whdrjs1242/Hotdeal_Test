import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, idParam, ipHash, limit, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { refreshHotScore } from "@/lib/deals";
import { rateLimit } from "@/lib/cache";
import { XP } from "@/lib/levels";

type Ctx = { params: Promise<{ id: string }> };

/** 공유 기록 (공유 수 → 핫 점수, 공유 XP 일일 상한 20) */
export const POST = handler<Ctx>(async (req, { params }) => {
  const dealId = idParam((await params).id);
  const user = await getCurrentUser();
  await limit(`share:${user?.id ?? ipHash(req)}`, 30, 3600);
  const { channel } = await parseBody(req, z.object({ channel: z.enum(["kakao", "native", "copy", "x", "band"]) }));
  const inserted = await sql`
    INSERT INTO shares (deal_id, user_id, channel)
    SELECT ${dealId}, ${user?.id ?? null}, ${channel} WHERE EXISTS (SELECT 1 FROM deals WHERE id = ${dealId})`;
  if (!inserted.count) return NextResponse.json({ error: "없는 딜이에요" }, { status: 404 });
  await sql`UPDATE deals SET share_count = share_count + 1 WHERE id = ${dealId}`;
  if (user && (await rateLimit(`sharexp:${user.id}`, 20, 86400))) {
    await sql`UPDATE users SET xp = xp + ${XP.share} WHERE id = ${user.id}`;
  }
  await refreshHotScore(dealId);
  return NextResponse.json({ ok: true });
});
