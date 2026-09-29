import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, idParam, parseBody, requireUser } from "@/lib/api";
import { sql } from "@/lib/db";
import { awardBounty } from "@/lib/bounties";

type Ctx = { params: Promise<{ id: string }> };

/** 수배자가 발견 상품 채택 → 헌터에게 현상금 지급 */
export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const id = idParam((await params).id);
  const { dealId } = await parseBody(req, z.object({ dealId: z.coerce.number().int().positive() }));
  const [b] = await sql<{ userId: number }[]>`SELECT user_id FROM bounties WHERE id = ${id}`;
  if (!b) throw new ApiError(404, "없는 수배예요");
  if (b.userId !== user.id) throw new ApiError(403, "수배자만 채택할 수 있어요");
  const result = await awardBounty(id, dealId);
  return NextResponse.json({ prize: result.prize });
});
