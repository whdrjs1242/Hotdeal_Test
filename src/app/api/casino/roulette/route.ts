import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { playRoulette } from "@/lib/casino";

const choice = z.discriminatedUnion("type", [
  z.object({ type: z.literal("color"), value: z.enum(["red", "black"]) }),
  z.object({ type: z.literal("parity"), value: z.enum(["odd", "even"]) }),
  z.object({ type: z.literal("half"), value: z.enum(["low", "high"]) }),
  z.object({ type: z.literal("number"), value: z.number().int().min(0).max(36) }),
]);

export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`casino:${user.id}`, 120, 60);
  const body = await parseBody(req, z.object({ bet: z.coerce.number().int(), choice }));
  return NextResponse.json(await playRoulette(user.id, body.bet, body.choice));
});
