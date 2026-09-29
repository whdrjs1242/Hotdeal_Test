import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { sql } from "@/lib/db";

/** 마감 시간이 지난 딜 종료 처리. Vercel Cron 등에서 5분마다 호출 (Authorization: Bearer CRON_SECRET) */
export async function GET(req: NextRequest) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const res = await sql`UPDATE deals SET status = 'expired' WHERE status = 'active' AND ends_at < now()`;
  return NextResponse.json({ expired: res.count });
}
