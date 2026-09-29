import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, parseBody, requireUser } from "@/lib/api";
import { convertPoints } from "@/lib/casino";

/** 포인트 → 칩 (단방향). 칩 → 포인트 API 는 존재하지 않는다 */
export const POST = handler(async (req) => {
  const user = await requireUser();
  const { points } = await parseBody(req, z.object({ points: z.coerce.number().int().positive() }));
  return NextResponse.json(await convertPoints(user.id, points));
});
