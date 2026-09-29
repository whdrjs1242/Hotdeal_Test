import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, idParam, limit, parseBody, requireUser } from "@/lib/api";
import { addAnswer } from "@/lib/questions";
import { grantActivity } from "@/lib/rewards";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const id = idParam((await params).id);
  await limit(`answer:${user.id}`, 10, 60);
  const { body } = await parseBody(req, z.object({ body: z.string().trim().min(2).max(2000) }));
  const answerId = await addAnswer(id, user.id, body);
  const points = await grantActivity(user.id, "answer", String(id), "질문 답변").catch(() => 0);
  return NextResponse.json({ id: answerId, points }, { status: 201 });
});
