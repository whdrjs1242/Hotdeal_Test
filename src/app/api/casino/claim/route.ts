import { NextResponse } from "next/server";
import { handler, requireUser } from "@/lib/api";
import { claimChips } from "@/lib/casino";

export const POST = handler(async () => {
  const user = await requireUser();
  return NextResponse.json(await claimChips(user.id));
});
