import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { sql } from "@/lib/db";
import { createSessionToken, createUser, REF_COOKIE, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));
  let saved: { state: string; next: string };
  try {
    saved = JSON.parse(req.cookies.get("jj_oauth")?.value ?? "");
  } catch {
    return fail("state");
  }
  const code = req.nextUrl.searchParams.get("code");
  if (!code || req.nextUrl.searchParams.get("state") !== saved.state) return fail("state");

  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.kakaoClientId,
      client_secret: env.kakaoClientSecret,
      redirect_uri: `${env.siteUrl}/api/auth/kakao/callback`,
      code,
    }),
  });
  if (!tokenRes.ok) return fail("token");
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const meRes = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { authorization: `Bearer ${access_token}` } });
  if (!meRes.ok) return fail("profile");
  const me = (await meRes.json()) as { id: number; properties?: { nickname?: string; profile_image?: string } };

  const kakaoId = String(me.id);
  const [existing] = await sql<{ id: number }[]>`SELECT id FROM users WHERE kakao_id = ${kakaoId}`;
  const id =
    existing?.id ??
    (await createUser({
      nickname: me.properties?.nickname ?? "줍러",
      kakaoId,
      avatarUrl: me.properties?.profile_image ?? null,
      refCode: req.cookies.get(REF_COOKIE)?.value,
    }));
  const res = NextResponse.redirect(new URL(saved.next, req.url));
  res.cookies.set(SESSION_COOKIE, await createSessionToken(id), sessionCookieOptions);
  res.cookies.delete("jj_oauth");
  return res;
}
