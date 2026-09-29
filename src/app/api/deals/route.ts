import { NextResponse } from "next/server";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { listDeals, type SortKey } from "@/lib/deals";
import { cached } from "@/lib/cache";
import { createDeal, createDealSchema } from "@/lib/dealService";

const SORTS: SortKey[] = ["hot", "new", "ending", "top"];

export const GET = handler(async (req) => {
  const sp = req.nextUrl.searchParams;
  const sort = (SORTS.includes(sp.get("sort") as SortKey) ? sp.get("sort") : "hot") as SortKey;
  const category = sp.get("category") ?? "all";
  const cursor = sp.get("cursor");
  const q = sp.get("q");
  const userId = sp.get("user") ? Number(sp.get("user")) : undefined;
  // 검색이 아닌 공용 피드는 짧게 캐시 → 수십만 동시접속에도 DB 부하 일정
  const load = () => listDeals({ sort, category, cursor, q, userId });
  const data = q || userId ? await load() : await cached(`feed:${sort}:${category}:${cursor ?? ""}`, 15, load);
  return NextResponse.json(data, { headers: { "cache-control": "public, s-maxage=10, stale-while-revalidate=30" } });
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`post:${user.id}`, 20, 3600);
  const input = await parseBody(req, createDealSchema);
  const id = await createDeal(user.id, input);
  return NextResponse.json({ id }, { status: 201 });
});
