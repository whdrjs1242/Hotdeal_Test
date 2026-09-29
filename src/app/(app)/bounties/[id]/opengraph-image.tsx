import { ImageResponse } from "next/og";
import { getBounty } from "@/lib/bounties";
import { loadKoreanFont } from "@/lib/ogFont";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "줍줍 수배";

/** 수배 공유 이미지 — 무엇을, 얼마 이하로, 현상금 얼마 */
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const b = await getBounty(Number((await params).id));
  const title = b?.title ?? "수배";
  const target = b?.targetPrice ? `${b.targetPrice.toLocaleString("ko-KR")}원 이하로 찾아요` : "가장 싼 곳을 찾아요";
  const pot = `현상금 ${(b?.pot ?? 0).toLocaleString("ko-KR")}P`;
  const people = `${(b?.participantCount ?? 0).toLocaleString("ko-KR")}명이 함께 찾는 중`;
  const font = await loadKoreanFont(`${title}${target}${pot}${people}줍줍수배찾아서올리면현상금을받아요`);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff", fontFamily: "Kr", padding: 64 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: "#ff5b2e" }}>줍줍</div>
            <div style={{ display: "flex", fontSize: 26, color: "#ff5b2e", background: "#fff1ec", padding: "6px 16px", borderRadius: 10 }}>수배</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 58, fontWeight: 800, color: "#191f28", lineHeight: 1.3 }}>
              {title.length > 28 ? title.slice(0, 28) + "…" : title}
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#4e5968", marginTop: 16 }}>{target}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: "#ff5b2e" }}>{pot}</div>
            <div style={{ fontSize: 30, color: "#8b95a1" }}>{people}</div>
          </div>
        </div>
        {b?.imageUrl && (
          <div style={{ width: 360, height: 360, display: "flex", alignSelf: "center", borderRadius: 24, overflow: "hidden", background: "#f2f4f6", marginLeft: 40 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.imageUrl} width={360} height={360} style={{ objectFit: "cover" }} alt="" />
          </div>
        )}
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Kr", data: font, weight: 800, style: "normal" }] : undefined },
  );
}
