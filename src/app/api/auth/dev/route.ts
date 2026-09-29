import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, limit, parseBody, clientIp } from "@/lib/api";
import { env } from "@/lib/env";
import { sql } from "@/lib/db";
import { createSessionToken, createUser, REF_COOKIE, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

/** 개발/데모용 닉네임 로그인. 운영에서는 ALLOW_DEV_LOGIN=false 로 비활성화 */
export const POST = handler(async (req) => {
  if (!env.allowDevLogin) return NextResponse.json({ error: "disabled" }, { status: 404 });
  await limit(`devlogin:${clientIp(req)}`, 20, 3600);
  const { nickname } = await parseBody(req, z.object({ nickname: z.string().trim().min(2).max(20) }));
  const [existing] = await sql<{ id: number }[]>`SELECT id FROM users WHERE nickname = ${nickname}`;
  const id = existing?.id ?? (await createUser({ nickname, refCode: req.cookies.get(REF_COOKIE)?.value }));
  const res = NextResponse.json({ id });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(id), sessionCookieOptions);
  return res;
});
