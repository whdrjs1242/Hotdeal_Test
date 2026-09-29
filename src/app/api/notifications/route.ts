import { NextResponse } from "next/server";
import { handler, requireUser } from "@/lib/api";
import { sql } from "@/lib/db";

export const POST = handler(async () => {
  const user = await requireUser();
  await sql`UPDATE notifications SET read_at = now() WHERE user_id = ${user.id} AND read_at IS NULL`;
  return NextResponse.json({ ok: true });
});
