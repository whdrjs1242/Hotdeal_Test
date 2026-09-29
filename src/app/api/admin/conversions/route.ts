import { NextResponse } from "next/server";
import { handler, requireUser, ApiError } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { ingestConversion, type ConversionReport } from "@/lib/rewards";

/**
 * 제휴사 실적 CSV 업로드 (관리자).
 * 헤더: network,external_id,sub_id,order_amount,commission,status[,ordered_at]
 * 각 제휴사 리포트를 이 형식으로 변환해 올리거나, 제휴사 API 폴링 워커가 ingestConversion을 직접 호출한다.
 */
export const POST = handler(async (req) => {
  const user = await requireUser();
  if (!isAdmin(user.id)) throw new ApiError(403, "권한이 없어요");
  const text = await req.text();
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",").map((c) => c.trim());
  const idx = (name: string) => cols.indexOf(name);
  for (const need of ["network", "external_id", "sub_id", "commission", "status"]) {
    if (idx(need) < 0) throw new ApiError(400, `CSV에 ${need} 컬럼이 필요해요`);
  }
  let ok = 0;
  const errors: string[] = [];
  for (const [n, line] of lines.entries()) {
    const v = line.split(",").map((c) => c.trim());
    const status = v[idx("status")] as ConversionReport["status"];
    if (!["pending", "confirmed", "canceled"].includes(status)) {
      errors.push(`${n + 2}행: status 값 오류`);
      continue;
    }
    try {
      await ingestConversion({
        network: v[idx("network")],
        externalId: v[idx("external_id")],
        subId: v[idx("sub_id")] || null,
        orderAmount: Number(v[idx("order_amount")] ?? 0) || 0,
        commission: Number(v[idx("commission")]) || 0,
        status,
        orderedAt: idx("ordered_at") >= 0 && v[idx("ordered_at")] ? new Date(v[idx("ordered_at")]) : undefined,
        raw: Object.fromEntries(cols.map((c, i) => [c, v[i]])),
      });
      ok++;
    } catch (e) {
      errors.push(`${n + 2}행: ${(e as Error).message}`);
    }
  }
  return NextResponse.json({ ok, errors });
});
