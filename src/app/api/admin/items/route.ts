import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, parseBody, requireUser } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

/** 관리자: 마켓 상품 추가 (상품권·제휴 상품) */
export const POST = handler(async (req) => {
  const user = await requireUser();
  if (!isAdmin(user.id)) throw new ApiError(403, "권한이 없어요");
  const i = await parseBody(
    req,
    z.object({
      kind: z.enum(["giftcard", "product"]),
      name: z.string().trim().min(2).max(60),
      description: z.string().trim().max(200).optional(),
      image: z.string().trim().max(500).optional(),
      pricePoints: z.coerce.number().int().positive(),
      stock: z.coerce.number().int().min(0).optional().nullable(),
      maxPerUserMonth: z.coerce.number().int().positive().optional().nullable(),
    }),
  );
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO shop_items (kind, name, description, image, price_points, stock, max_per_user_month, sort)
    VALUES (${i.kind}, ${i.name}, ${i.description ?? null}, ${i.image ?? null}, ${i.pricePoints}, ${i.stock ?? null},
            ${i.maxPerUserMonth ?? null}, 50)
    RETURNING id`;
  return NextResponse.json({ id: row.id }, { status: 201 });
});

/** 관리자: 판매 중지/재개 */
export const PATCH = handler(async (req) => {
  const user = await requireUser();
  if (!isAdmin(user.id)) throw new ApiError(403, "권한이 없어요");
  const { id, active } = await parseBody(req, z.object({ id: z.coerce.number().int().positive(), active: z.boolean() }));
  await sql`UPDATE shop_items SET active = ${active} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
});
