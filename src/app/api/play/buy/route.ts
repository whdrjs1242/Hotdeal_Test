import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, parseBody, requireUser } from "@/lib/api";
import { buyWithMarbles } from "@/lib/play";

export const POST = handler(async (req) => {
  const user = await requireUser();
  const { itemId } = await parseBody(req, z.object({ itemId: z.coerce.number().int().positive() }));
  return NextResponse.json({ item: await buyWithMarbles(user.id, itemId) });
});
