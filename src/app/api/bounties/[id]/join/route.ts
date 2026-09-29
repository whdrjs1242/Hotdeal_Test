import { NextResponse } from "next/server";
import { handler, idParam, limit, requireUser } from "@/lib/api";
import { joinBounty, refreshBountyScore } from "@/lib/bounties";
import { grantActivity } from "@/lib/rewards";

type Ctx = { params: Promise<{ id: string }> };

/** "나도 찾아요" 참여 → 발견 알림 대상 + 참여 포인트 */
export const POST = handler<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const id = idParam((await params).id);
  await limit(`join:${user.id}`, 60, 3600);
  const joined = await joinBounty(id, user.id);
  let points = 0;
  if (joined) {
    points = await grantActivity(user.id, "join", String(id), "수배 참여");
    await refreshBountyScore(id);
  }
  return NextResponse.json({ joined: true, points });
});
