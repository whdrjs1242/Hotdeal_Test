import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { answerQuiz, getQuiz } from "@/lib/games";

/** 최저가 맞히기: 오늘 문제 조회 */
export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json(await getQuiz(user.id));
});

/** 답 제출 */
export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`quiz:${user.id}`, 30, 60);
  const { choice } = await parseBody(req, z.object({ choice: z.number().int().min(0).max(3) }));
  return NextResponse.json(await answerQuiz(user.id, choice));
});
