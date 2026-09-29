import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser, REF_COOKIE } from "@/lib/auth";
import { buildOutboundUrl } from "@/lib/affiliate";
import { ensureAffiliateBase } from "@/lib/dealService";
import { cached, rateLimit } from "@/lib/cache";
import { ipHash } from "@/lib/api";
import { refreshHotScore } from "@/lib/deals";
import { XP } from "@/lib/levels";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 구매 버튼 → 제휴 링크 리다이렉트.
 * 1) 클릭 로그 생성 (id = 제휴사 subId)  2) 공유자 귀속  3) 302 이동
 * 딜 정보는 캐시해서 DB는 INSERT 1회 + UPDATE 1회만 수행한다.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.redirect(new URL("/", req.url));

  const deal = await cached(`go:${id}`, 300, async () => {
    const [d] = await sql<{ id: number; canonicalUrl: string; merchant: string; network: string; monetized: boolean; userId: number }[]>`
      SELECT id, canonical_url, merchant, network, monetized, user_id FROM deals WHERE id = ${id} AND status <> 'hidden'`;
    if (!d) return null;
    const base = d.monetized ? await ensureAffiliateBase(d.canonicalUrl, d.network) : null;
    return { ...d, base };
  });
  if (!deal) return NextResponse.redirect(new URL("/", req.url));

  const user = await getCurrentUser();
  const refCode = req.nextUrl.searchParams.get("r") ?? req.cookies.get(REF_COOKIE)?.value ?? null;
  const sharer = refCode
    ? await cached(`ref:${refCode}`, 3600, async () => {
        const [u] = await sql<{ id: number }[]>`SELECT id FROM users WHERE ref_code = ${refCode}`;
        return u?.id ?? null;
      })
    : null;
  const sharerId = sharer && sharer !== user?.id ? sharer : null;
  const ip = ipHash(req);

  let clickId = "0";
  try {
    const [c] = await sql<{ id: number }[]>`
      INSERT INTO clicks (deal_id, user_id, sharer_id, network, ip_hash)
      VALUES (${deal.id}, ${user?.id ?? null}, ${sharerId}, ${deal.network}, ${ip}) RETURNING id`;
    clickId = String(c.id);
    // 같은 IP의 반복 클릭은 카운트/XP 에 반영하지 않는다 (어뷰징 방지)
    if (await rateLimit(`click:${deal.id}:${ip}`, 1, 3600)) {
      await sql`UPDATE deals SET click_count = click_count + 1 WHERE id = ${deal.id}`;
      if (sharerId && (await rateLimit(`clickxp:${sharerId}`, 50, 86400))) {
        await sql`UPDATE users SET xp = xp + ${XP.shareClick} WHERE id = ${sharerId}`;
      }
      await refreshHotScore(deal.id);
    }
  } catch (e) {
    // 로깅 실패가 구매 이동을 막으면 안 된다
    console.error("click log failed", e);
  }

  const target = buildOutboundUrl(deal.canonicalUrl, deal.merchant, clickId, deal.base);
  const res = NextResponse.redirect(target, 302);
  res.headers.set("cache-control", "no-store");
  res.headers.set("referrer-policy", "no-referrer-when-downgrade");
  return res;
}
