import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { playSlot } from "@/lib/casino";

export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`casino:${user.id}`, 120, 60);
  const { bet } = await parseBody(req, z.object({ bet: z.coerce.number().int() }));
  return NextResponse.json(await playSlot(user.id, bet));
});
