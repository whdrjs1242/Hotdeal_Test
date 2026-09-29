import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, idParam, parseBody, requireUser } from "@/lib/api";
import { acceptAnswer } from "@/lib/questions";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const id = idParam((await params).id);
  const { answerId } = await parseBody(req, z.object({ answerId: z.coerce.number().int().positive() }));
  return NextResponse.json({ reward: await acceptAnswer(id, answerId, user.id) });
});
