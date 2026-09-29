import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, idParam, parseBody, requireUser } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { settleOrder } from "@/lib/market";

type Ctx = { params: Promise<{ id: string }> };

async function admin() {
  const user = await requireUser();
  if (!isAdmin(user.id)) throw new ApiError(403, "권한이 없어요");
}

/** 관리자: 받는 사람 연락처 조회 (발송용) */
export const GET = handler<Ctx>(async (_req, { params }) => {
  await admin();
  const id = idParam((await params).id);
  const [o] = await sql<{ contactEnc: string | null }[]>`SELECT contact_enc FROM orders WHERE id = ${id}`;
  if (!o) throw new ApiError(404, "없는 주문이에요");
  return NextResponse.json({ contact: o.contactEnc ? decrypt(o.contactEnc) : null });
});

/** 관리자: 발송 완료(쿠폰번호/송장) 또는 취소(포인트 환불) */
export const PATCH = handler<Ctx>(async (req, { params }) => {
  await admin();
  const id = idParam((await params).id);
  const { action, delivery, memo } = await parseBody(
    req,
    z.object({ action: z.enum(["fulfill", "cancel"]), delivery: z.string().max(200).optional(), memo: z.string().max(200).optional() }),
  );
  await settleOrder(id, action, delivery, memo);
  return NextResponse.json({ ok: true });
});
