import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, idParam, limit, parseBody, requireUser } from "@/lib/api";
import { sql } from "@/lib/db";
import { refreshHotScore } from "@/lib/deals";
import { XP } from "@/lib/levels";
import { grantActivity } from "@/lib/rewards";

type Ctx = { params: Promise<{ id: string }> };

/** 딜 온도 투표: 1(핫) / -1(쿨) / 0(취소) */
export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const dealId = idParam((await params).id);
  await limit(`vote:${user.id}`, 120, 60);
  const { value } = await parseBody(req, z.object({ value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) }));

  const result = await sql.begin(async (tx) => {
    const [deal] = await tx<{ userId: number }[]>`SELECT user_id FROM deals WHERE id = ${dealId} FOR UPDATE`;
    if (!deal) return null;
    if (deal.userId === user.id) return "own" as const;
    const [prev] = await tx<{ value: number }[]>`
      SELECT value FROM deal_votes WHERE deal_id = ${dealId} AND user_id = ${user.id}`;
    const before = prev?.value ?? 0;
    if (before === value) return { before, value };
    if (value === 0) await tx`DELETE FROM deal_votes WHERE deal_id = ${dealId} AND user_id = ${user.id}`;
    else
      await tx`
        INSERT INTO deal_votes (deal_id, user_id, value) VALUES (${dealId}, ${user.id}, ${value})
        ON CONFLICT (deal_id, user_id) DO UPDATE SET value = EXCLUDED.value`;
    const up = (value === 1 ? 1 : 0) - (before === 1 ? 1 : 0);
    const down = (value === -1 ? 1 : 0) - (before === -1 ? 1 : 0);
    await tx`UPDATE deals SET votes_up = votes_up + ${up}, votes_down = votes_down + ${down} WHERE id = ${dealId}`;
    // 게시자에게 추천 XP (추천 취소 시 회수)
    if (up) await tx`UPDATE users SET xp = greatest(0, xp + ${up * XP.receivedUpvote}) WHERE id = ${deal.userId}`;
    return { before, value };
  });
  if (!result) return NextResponse.json({ error: "없는 딜이에요" }, { status: 404 });
  if (result === "own") return NextResponse.json({ error: "내 딜에는 투표할 수 없어요" }, { status: 400 });
  await refreshHotScore(dealId);
  // 평가 참여 보상 (딜당 1회)
  if (result.value !== 0) await grantActivity(user.id, "vote", String(dealId), "딜 평가 참여").catch(() => 0);
  const [d] = await sql<{ votesUp: number; votesDown: number }[]>`SELECT votes_up, votes_down FROM deals WHERE id = ${dealId}`;
  return NextResponse.json({ myVote: result.value, ...d });
});
