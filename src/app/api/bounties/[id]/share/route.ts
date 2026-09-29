import { NextResponse } from "next/server";
import { handler, idParam, ipHash, limit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { refreshBountyScore } from "@/lib/bounties";

type Ctx = { params: Promise<{ id: string }> };

/** 공유 횟수 기록 (포인트는 실제 유입 시 /api/arrivals 에서 지급) */
export const POST = handler<Ctx>(async (req, { params }) => {
  const id = idParam((await params).id);
  const user = await getCurrentUser();
  await limit(`bshare:${user?.id ?? ipHash(req)}`, 30, 3600);
  await sql`UPDATE bounties SET share_count = share_count + 1 WHERE id = ${id}`;
  await refreshBountyScore(id);
  return NextResponse.json({ ok: true });
});
