import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, parseBody, requireUser } from "@/lib/api";
import { buyWithChips } from "@/lib/casino";

export const POST = handler(async (req) => {
  const user = await requireUser();
  const { itemId } = await parseBody(req, z.object({ itemId: z.coerce.number().int().positive() }));
  return NextResponse.json({ item: await buyWithChips(user.id, itemId) });
});
