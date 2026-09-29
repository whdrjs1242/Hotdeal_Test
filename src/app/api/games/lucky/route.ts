import { NextResponse } from "next/server";
import { handler, requireUser } from "@/lib/api";
import { openLuckyBox } from "@/lib/games";

export const POST = handler(async () => {
  const user = await requireUser();
  return NextResponse.json(await openLuckyBox(user.id));
});
