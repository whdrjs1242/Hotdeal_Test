import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, idParam, parseBody, requireUser } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { credit } from "@/lib/rewards";
import { decrypt } from "@/lib/crypto";

type Ctx = { params: Promise<{ id: string }> };

/** 관리자: 계좌 조회(송금용) */
export const GET = handler<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  if (!isAdmin(user.id)) throw new ApiError(403, "권한이 없어요");
  const id = idParam((await params).id);
  const [w] = await sql<{ accountEnc: string; bankName: string; holderName: string; amountKrw: number }[]>`
    SELECT account_enc, bank_name, holder_name, amount_krw FROM withdrawals WHERE id = ${id}`;
  if (!w) throw new ApiError(404, "없는 신청이에요");
  return NextResponse.json({ bank: w.bankName, holder: w.holderName, account: decrypt(w.accountEnc), amount: w.amountKrw });
});

/** 관리자: 송금 완료(paid) 또는 반려(rejected → 포인트 복원) */
export const PATCH = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  if (!isAdmin(user.id)) throw new ApiError(403, "권한이 없어요");
  const id = idParam((await params).id);
  const { status, memo } = await parseBody(
    req,
    z.object({ status: z.enum(["paid", "rejected"]), memo: z.string().max(200).optional() }),
  );
  await sql.begin(async (tx) => {
    const [w] = await tx<{ userId: number; points: number; status: string }[]>`
      SELECT user_id, points, status FROM withdrawals WHERE id = ${id} FOR UPDATE`;
    if (!w || w.status !== "requested") throw new ApiError(400, "이미 처리된 신청이에요");
    await tx`UPDATE withdrawals SET status = ${status}, memo = ${memo ?? null}, processed_at = now() WHERE id = ${id}`;
    if (status === "rejected") {
      await credit(tx, w.userId, w.points, "withdraw_refund", `현금화 반려${memo ? `: ${memo}` : ""}`, `withdraw:${id}`);
    }
  });
  return NextResponse.json({ ok: true });
});
