import { ImageResponse } from "next/og";
import { getDeal } from "@/lib/deals";
import { discountRate, temperature } from "@/lib/ranking";
import { merchantById } from "@/lib/affiliate/merchants";
import { loadKoreanFont } from "@/lib/ogFont";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "줍줍 핫딜";

/** 카톡/SNS 공유 카드 — 할인율·가격·온도를 크게 보여줘 클릭을 부른다 */
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const deal = await getDeal(Number((await params).id));
  const title = deal?.title ?? "줍줍 핫딜";
  const off = deal ? discountRate(deal.price, deal.originalPrice) : 0;
  const price = deal?.price != null ? `${deal.price.toLocaleString("ko-KR")}원` : "";
  const temp = deal ? temperature(deal.votesUp, deal.votesDown) : 36.5;
  const merchant = deal ? merchantById(deal.merchant).name : "";
  const text = `${title}${price}${merchant}줍줍핫딜오늘의°C%원지금확인하기🔥0123456789`;
  const font = await loadKoreanFont(text);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fff", fontFamily: "NotoKR" }}>
        <div style={{ width: 630, height: 630, display: "flex", background: "#f6f7f9", alignItems: "center", justifyContent: "center" }}>
          {deal?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={deal.imageUrl} width={630} height={630} style={{ objectFit: "cover" }} alt="" />
          ) : (
            <div style={{ fontSize: 200 }}>🛍</div>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 48, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: "#ff4d2e" }}>줍줍</div>
            <div style={{ fontSize: 26, color: "#6b7280" }}>{`${merchant} 핫딜`}</div>
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, lineHeight: 1.3, color: "#16181d" }}>
            {title.length > 42 ? title.slice(0, 42) + "…" : title}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              {off > 0 && <div style={{ fontSize: 72, fontWeight: 800, color: "#ff4d2e" }}>{`${off}%`}</div>}
              <div style={{ fontSize: 60, fontWeight: 800, color: "#16181d" }}>{price}</div>
            </div>
            <div style={{ display: "flex", marginTop: 16, fontSize: 30, color: temp >= 50 ? "#ff4d2e" : "#6b7280" }}>
              {`🔥 딜 온도 ${temp}°C · 지금 확인하기`}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "NotoKR", data: font, weight: 800, style: "normal" }] : undefined,
      emoji: "twemoji",
    },
  );
}
