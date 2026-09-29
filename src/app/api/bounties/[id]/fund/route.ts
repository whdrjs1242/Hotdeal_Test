import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, idParam, limit, parseBody, requireUser } from "@/lib/api";
import { fundBounty, refreshBountyScore } from "@/lib/bounties";

type Ctx = { params: Promise<{ id: string }> };

/** 현상금 올리기 */
export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const id = idParam((await params).id);
  await limit(`fund:${user.id}`, 20, 3600);
  const { amount } = await parseBody(req, z.object({ amount: z.coerce.number().int().positive().max(1_000_000) }));
  const pot = await fundBounty(id, user.id, amount);
  await refreshBountyScore(id);
  return NextResponse.json({ pot });
});
