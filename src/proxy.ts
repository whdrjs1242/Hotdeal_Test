import { NextResponse, type NextRequest } from "next/server";

/**
 * 공유 링크(?r=코드)로 들어온 방문자에게 공유자 코드를 30일간 기억시킨다.
 * → 구매 클릭 시 공유자에게 수익이 귀속되고, 가입 시 초대자로 연결된다.
 */
export function proxy(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("r");
  if (!ref || !/^[a-z0-9]{4,12}$/.test(ref)) return NextResponse.next();
  const res = NextResponse.next();
  res.cookies.set("jj_ref", ref, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", httpOnly: true });
  return res;
}

export const config = {
  matcher: ["/deals/:path*", "/c/:path*", "/@:path*", "/"],
};
