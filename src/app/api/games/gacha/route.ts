import { NextResponse } from "next/server";
import { handler, limit, requireUser } from "@/lib/api";
import { drawGacha } from "@/lib/games";

export const POST = handler(async () => {
  const user = await requireUser();
  await limit(`gacha:${user.id}`, 30, 60);
  const item = await drawGacha(user.id);
  return NextResponse.json({ item });
});
