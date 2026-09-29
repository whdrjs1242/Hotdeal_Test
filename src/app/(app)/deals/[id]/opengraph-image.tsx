import { ImageResponse } from "next/og";
import { getDeal } from "@/lib/deals";
import { discountRate } from "@/lib/ranking";
import { merchantById } from "@/lib/affiliate/merchants";
import { loadKoreanFont } from "@/lib/ogFont";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "줍줍 핫딜";

/** 카카오톡·SNS 공유 이미지 — 상품·할인율·가격을 크게 */
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const deal = await getDeal(Number((await params).id));
  const title = deal?.title ?? "줍줍 핫딜";
  const off = deal ? discountRate(deal.price, deal.originalPrice) : 0;
  const price = deal?.price != null ? `${deal.price.toLocaleString("ko-KR")}원` : "";
  const orig = deal?.originalPrice && off ? `${deal.originalPrice.toLocaleString("ko-KR")}원` : "";
  const merchant = deal ? merchantById(deal.merchant).name : "";
  const votes = deal ? `추천 ${deal.votesUp}` : "";
  const font = await loadKoreanFont(`${title}${price}${orig}${merchant}${votes}줍줍핫딜%원0123456789`);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff", fontFamily: "Kr" }}>
        <div style={{ width: 630, height: 630, display: "flex", background: "#f2f4f6", alignItems: "center", justifyContent: "center" }}>
          {deal?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={deal.imageUrl} width={630} height={630} style={{ objectFit: "cover" }} alt="" />
          ) : (
            <div style={{ display: "flex", fontSize: 64, color: "#8b95a1" }}>{merchant}</div>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 56, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: "#ff5b2e" }}>줍줍</div>
            <div style={{ fontSize: 28, color: "#8b95a1" }}>{merchant}</div>
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, lineHeight: 1.35, color: "#191f28" }}>
            {title.length > 40 ? title.slice(0, 40) + "…" : title}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {orig && <div style={{ display: "flex", fontSize: 30, color: "#8b95a1", textDecoration: "line-through" }}>{orig}</div>}
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              {off > 0 && <div style={{ fontSize: 68, fontWeight: 800, color: "#ff5b2e" }}>{`${off}%`}</div>}
              <div style={{ fontSize: 64, fontWeight: 800, color: "#191f28" }}>{price}</div>
            </div>
            <div style={{ display: "flex", marginTop: 12, fontSize: 28, color: "#4e5968" }}>{votes}</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Kr", data: font, weight: 800, style: "normal" }] : undefined },
  );
}
