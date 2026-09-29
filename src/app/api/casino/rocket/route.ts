import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { playRocket } from "@/lib/casino";

export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`casino:${user.id}`, 120, 60);
  const { bet, target } = await parseBody(req, z.object({ bet: z.coerce.number().int(), target: z.coerce.number() }));
  return NextResponse.json(await playRocket(user.id, bet, Math.round(target * 100) / 100));
});
