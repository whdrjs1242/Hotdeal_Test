import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, idParam, parseBody, requireUser } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { invalidate } from "@/lib/cache";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  if (!isAdmin(user.id)) throw new ApiError(403, "권한이 없어요");
  const id = idParam((await params).id);
  const { status } = await parseBody(req, z.object({ status: z.enum(["active", "soldout", "expired", "hidden"]) }));
  await sql`UPDATE deals SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  await invalidate(`deal:${id}`, `go:${id}`);
  return NextResponse.json({ ok: true });
});
