import { NextResponse } from "next/server";
import { handler, idParam, limit, requireUser } from "@/lib/api";
import { voteAnswer } from "@/lib/questions";
import { grantActivity } from "@/lib/rewards";

type Ctx = { params: Promise<{ id: string }> };

/** 답변 추천 (1회) — 추천한 사람에게 평가 참여 포인트 */
export const POST = handler<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const id = idParam((await params).id);
  await limit(`avote:${user.id}`, 60, 60);
  const votes = await voteAnswer(id, user.id);
  if (votes == null) return NextResponse.json({ error: "이미 추천했거나 내 답변이에요" }, { status: 400 });
  await grantActivity(user.id, "vote", `a${id}`, "답변 추천").catch(() => 0);
  return NextResponse.json({ votesUp: votes });
});
