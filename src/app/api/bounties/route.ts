import { NextResponse } from "next/server";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { cached, invalidate } from "@/lib/cache";
import { createBounty, createBountySchema, listBounties, type BountySort } from "@/lib/bounties";

const SORTS: BountySort[] = ["hot", "new", "ending", "found"];

export const GET = handler(async (req) => {
  const sp = req.nextUrl.searchParams;
  const sort = (SORTS.includes(sp.get("sort") as BountySort) ? sp.get("sort") : "hot") as BountySort;
  const cursor = sp.get("cursor");
  const q = sp.get("q");
  const load = () => listBounties({ sort, cursor, q });
  const data = q ? await load() : await cached(`bounties:${sort}:${cursor ?? ""}`, 15, load);
  return NextResponse.json(data, { headers: { "cache-control": "public, s-maxage=10, stale-while-revalidate=30" } });
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`bounty:${user.id}`, 10, 3600);
  const input = await parseBody(req, createBountySchema);
  const id = await createBounty(user.id, input);
  await invalidate("bounties:new:", "bounties:hot:");
  return NextResponse.json({ id }, { status: 201 });
});
