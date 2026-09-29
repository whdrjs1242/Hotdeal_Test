import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, parseBody, requireUser } from "@/lib/api";
import { equip, SLOTS } from "@/lib/cosmetics";

export const POST = handler(async (req) => {
  const user = await requireUser();
  const { slot, itemKey } = await parseBody(req, z.object({ slot: z.enum(SLOTS), itemKey: z.string().max(50).nullable() }));
  if (!(await equip(user.id, slot, itemKey))) return NextResponse.json({ error: "보유하지 않은 아이템이에요" }, { status: 400 });
  return NextResponse.json({ ok: true });
});
