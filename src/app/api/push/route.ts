import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, parseBody, requireUser } from "@/lib/api";
import { sql } from "@/lib/db";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  const sub = await parseBody(req, subSchema);
  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${user.id}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth})
    ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`;
  return NextResponse.json({ ok: true });
});

export const DELETE = handler(async (req) => {
  const user = await requireUser();
  const { endpoint } = await parseBody(req, z.object({ endpoint: z.string().max(1000) }));
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND user_id = ${user.id}`;
  return NextResponse.json({ ok: true });
});
