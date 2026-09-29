import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { buyItem } from "@/lib/market";

export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`buy:${user.id}`, 20, 3600);
  const { itemId, contact } = await parseBody(
    req,
    z.object({ itemId: z.coerce.number().int().positive(), contact: z.string().trim().max(300).optional().nullable() }),
  );
  const { orderId, item } = await buyItem(user.id, itemId, contact);
  return NextResponse.json({ orderId, kind: item.kind, name: item.name }, { status: 201 });
});
