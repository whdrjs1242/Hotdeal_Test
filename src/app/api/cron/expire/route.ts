import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { sql } from "@/lib/db";
import { settleExpiredBounties } from "@/lib/bounties";
import { settleExpiredQuestions } from "@/lib/questions";

/** 마감 딜 종료 + 마감 수배 정산(자동 채택 또는 환불). Vercel Cron 등에서 5분마다 호출 (Authorization: Bearer CRON_SECRET) */
export async function GET(req: NextRequest) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const res = await sql`UPDATE deals SET status = 'expired' WHERE status = 'active' AND ends_at < now()`;
  const bounties = await settleExpiredBounties();
  const questions = await settleExpiredQuestions();
  return NextResponse.json({ expired: res.count, bounties, questions });
}
