import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, ipHash, limit, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { cached } from "@/lib/cache";
import { grantActivity } from "@/lib/rewards";

/**
 * 공유 링크(?r=코드)로 실제 사람이 들어왔을 때 호출되는 비콘.
 * 방문자(IP 해시)·대상·하루 단위로 한 번만 인정하고, 공유자에게 유입 포인트를 준다.
 * 본인 방문, 로봇(UA), 존재하지 않는 대상은 무시한다.
 */
export const POST = handler(async (req) => {
  const { type, id, r } = await parseBody(
    req,
    z.object({ type: z.enum(["deal", "bounty"]), id: z.coerce.number().int().positive(), r: z.string().regex(/^[a-z0-9]{4,12}$/) }),
  );
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || /bot|crawl|spider|preview|facebookexternalhit|kakaotalk-scrap|slack|headless/i.test(ua)) {
    return NextResponse.json({ counted: false });
  }
  const ip = ipHash(req);
  await limit(`arrive:${ip}`, 60, 3600);
  const sharerId = await cached(`ref:${r}`, 3600, async () => {
    const [u] = await sql<{ id: number }[]>`SELECT id FROM users WHERE ref_code = ${r}`;
    return u?.id ?? null;
  });
  const viewer = await getCurrentUser();
  if (!sharerId || viewer?.id === sharerId) return NextResponse.json({ counted: false });

  const table = type === "deal" ? sql`deals` : sql`bounties`;
  const [exists] = await sql`SELECT 1 FROM ${table} WHERE id = ${id}`;
  if (!exists) return NextResponse.json({ counted: false });

  const res = await sql`
    INSERT INTO share_arrivals (sharer_id, target_type, target_id, ip_hash, day)
    VALUES (${sharerId}, ${type}, ${id}, ${ip}, (now() AT TIME ZONE 'Asia/Seoul')::date)
    ON CONFLICT DO NOTHING RETURNING id`;
  if (!res.length) return NextResponse.json({ counted: false });
  await grantActivity(sharerId, "shareArrival", `a${res[0].id}`, type === "deal" ? "공유한 딜로 친구 유입" : "공유한 수배로 친구 유입");
  return NextResponse.json({ counted: true });
});
