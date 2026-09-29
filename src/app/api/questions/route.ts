import { NextResponse } from "next/server";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { createQuestion, createQuestionSchema } from "@/lib/questions";

export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`question:${user.id}`, 10, 3600);
  const input = await parseBody(req, createQuestionSchema);
  return NextResponse.json({ id: await createQuestion(user.id, input) }, { status: 201 });
});
