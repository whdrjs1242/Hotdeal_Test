import { NextResponse } from "next/server";
import { handler, requireUser } from "@/lib/api";
import { claimMarbles } from "@/lib/play";

export const POST = handler(async () => {
  const user = await requireUser();
  return NextResponse.json(await claimMarbles(user.id));
});
