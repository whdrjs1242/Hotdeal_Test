import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { updownGuess, updownStart, updownState, updownStop } from "@/lib/play";

export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ state: await updownState(user.id) });
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`play:${user.id}`, 90, 60);
  const body = await parseBody(
    req,
    z.discriminatedUnion("action", [
      z.object({ action: z.literal("start"), bet: z.coerce.number().int() }),
      z.object({ action: z.literal("guess"), dir: z.enum(["up", "down"]) }),
      z.object({ action: z.literal("stop") }),
    ]),
  );
  if (body.action === "start") return NextResponse.json({ state: await updownStart(user.id, body.bet) });
  if (body.action === "guess") return NextResponse.json(await updownGuess(user.id, body.dir));
  return NextResponse.json(await updownStop(user.id));
});
