import { NextResponse } from "next/server";
import { handler, limit, requireUser } from "@/lib/api";
import { buyScratch } from "@/lib/play";

export const POST = handler(async () => {
  const user = await requireUser();
  await limit(`play:${user.id}`, 90, 60);
  return NextResponse.json(await buyScratch(user.id));
});
