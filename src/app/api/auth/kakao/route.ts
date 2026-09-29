import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { randomCode } from "@/lib/auth";

export function GET(req: NextRequest) {
  if (!env.kakaoClientId) return NextResponse.redirect(new URL("/login?error=kakao_not_configured", req.url));
  const state = randomCode(16);
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", env.kakaoClientId);
  url.searchParams.set("redirect_uri", `${env.siteUrl}/api/auth/kakao/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url);
  res.cookies.set("jj_oauth", JSON.stringify({ state, next: next.startsWith("/") && !next.startsWith("//") ? next : "/" }), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 600, secure: process.env.NODE_ENV === "production",
  });
  return res;
}
