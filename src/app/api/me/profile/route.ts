import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, parseBody, requireUser } from "@/lib/api";
import { sql } from "@/lib/db";

const RESERVED = new Set(["admin", "api", "jupjup", "official", "deals", "submit", "login", "me", "rank", "alerts"]);

/** 크리에이터 채널(핸들/소개) 설정 */
export const PATCH = handler(async (req) => {
  const user = await requireUser();
  const input = await parseBody(
    req,
    z.object({
      handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, "영문 소문자/숫자/_ 3~20자").optional(),
      bio: z.string().trim().max(160).optional(),
      nickname: z.string().trim().min(2).max(20).optional(),
    }),
  );
  if (input.handle && RESERVED.has(input.handle)) return NextResponse.json({ error: "사용할 수 없는 주소예요" }, { status: 400 });
  try {
    await sql`
      UPDATE users SET
        handle = COALESCE(${input.handle ?? null}, handle),
        bio = COALESCE(${input.bio ?? null}, bio),
        nickname = COALESCE(${input.nickname ?? null}, nickname)
      WHERE id = ${user.id}`;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return NextResponse.json({ error: "이미 사용 중이에요" }, { status: 409 });
    throw e;
  }
  return NextResponse.json({ ok: true });
});
