import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { sql } from "@/lib/db";
import { CASHOUT, debit } from "@/lib/rewards";
import { encrypt } from "@/lib/crypto";

/** 포인트 현금화 신청: 포인트를 즉시 차감(보류)하고 관리자 승인 후 송금 */
export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`withdraw:${user.id}`, 3, 86400);
  const input = await parseBody(
    req,
    z.object({
      points: z.coerce.number().int().min(CASHOUT.minPoints).max(10_000_000),
      bankName: z.string().trim().min(2).max(20),
      account: z.string().trim().regex(/^[\d-]{8,20}$/, "계좌번호를 확인해주세요"),
      holderName: z.string().trim().min(2).max(20),
    }),
  );
  const account = input.account.replace(/-/g, "");
  const amount = Math.floor(input.points * CASHOUT.rate);
  const id = await sql.begin(async (tx) => {
    await debit(tx, user.id, input.points, "withdraw", `현금화 신청 ${amount.toLocaleString()}원`);
    const [w] = await tx<{ id: number }[]>`
      INSERT INTO withdrawals (user_id, points, amount_krw, bank_name, account_enc, account_last4, holder_name)
      VALUES (${user.id}, ${input.points}, ${amount}, ${input.bankName}, ${encrypt(account)}, ${account.slice(-4)}, ${input.holderName})
      RETURNING id`;
    return w.id;
  });
  return NextResponse.json({ id, amount }, { status: 201 });
});
