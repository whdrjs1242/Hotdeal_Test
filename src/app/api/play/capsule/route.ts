import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { drawCapsules } from "@/lib/play";

export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`play:${user.id}`, 90, 60);
  const { count } = await parseBody(req, z.object({ count: z.union([z.literal(1), z.literal(10)]) }));
  return NextResponse.json(await drawCapsules(user.id, count));
});
