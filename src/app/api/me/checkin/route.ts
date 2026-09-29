import { NextResponse } from "next/server";
import { handler, requireUser } from "@/lib/api";
import { sql } from "@/lib/db";
import { grantPoints } from "@/lib/rewards";
import { XP } from "@/lib/levels";

const STREAK_BONUS_DAYS = 7;
const STREAK_BONUS_POINTS = 50;

/** 출석 체크: 연속 출석 스트릭 + 7일마다 보너스 포인트 */
export const POST = handler(async () => {
  const user = await requireUser();
  const [row] = await sql<{ streakDays: number }[]>`
    UPDATE users SET
      streak_days = CASE WHEN last_checkin = (now() AT TIME ZONE 'Asia/Seoul')::date - 1 THEN streak_days + 1 ELSE 1 END,
      last_checkin = (now() AT TIME ZONE 'Asia/Seoul')::date,
      xp = xp + ${XP.checkin}
    WHERE id = ${user.id} AND (last_checkin IS NULL OR last_checkin < (now() AT TIME ZONE 'Asia/Seoul')::date)
    RETURNING streak_days`;
  if (!row) return NextResponse.json({ already: true });
  let bonus = 0;
  if (row.streakDays % STREAK_BONUS_DAYS === 0) {
    bonus = STREAK_BONUS_POINTS;
    await grantPoints(user.id, bonus, "checkin", `${row.streakDays}일 연속 출석 보너스`);
  }
  return NextResponse.json({ streak: row.streakDays, xp: XP.checkin, bonus });
});
