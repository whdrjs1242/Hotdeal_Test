import { ImageResponse } from "next/og";
import { getBounty } from "@/lib/bounties";
import { loadKoreanFont } from "@/lib/ogFont";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "줍줍 현상금 수배";

/** 수배지 공유 카드 — 서부 현상금 포스터 */
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const b = await getBounty(Number((await params).id));
  const title = b?.title ?? "현상금 수배";
  const pot = `${(b?.pot ?? 0).toLocaleString("ko-KR")}P`;
  const target = b?.targetPrice ? `${b.targetPrice.toLocaleString("ko-KR")}원 이하로 찾습니다` : "최저가를 찾습니다";
  const people = `${(b?.participantCount ?? 0).toLocaleString("ko-KR")}명이 함께 찾는 중`;
  const font = await loadKoreanFont(`${title}${pot}${target}${people}WANTEDREWARD줍줍현상금수배찾으면포인트!`);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#fbf1dc",
          color: "#3b2a1a",
          fontFamily: "NotoKR",
          padding: 40,
        }}
      >
        <div style={{ flex: 1, display: "flex", border: "6px solid #3b2a1a", borderRadius: 16, padding: 36, alignItems: "center", gap: 40 }}>
          <div style={{ width: 400, height: 400, display: "flex", borderRadius: 16, overflow: "hidden", background: "#eadcbd", alignItems: "center", justifyContent: "center" }}>
            {b?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.imageUrl} width={400} height={400} style={{ objectFit: "cover" }} alt="" />
            ) : (
              <div style={{ fontSize: 160 }}>🎯</div>
            )}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 800, color: "#c2410c", letterSpacing: 8 }}>WANTED</div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800, marginTop: 12, lineHeight: 1.25 }}>
              {title.length > 30 ? title.slice(0, 30) + "…" : title}
            </div>
            <div style={{ display: "flex", fontSize: 28, marginTop: 12 }}>{target}</div>
            <div style={{ display: "flex", fontSize: 24, marginTop: 28, opacity: 0.7 }}>REWARD</div>
            <div style={{ display: "flex", fontSize: 84, fontWeight: 800 }}>{pot}</div>
            <div style={{ display: "flex", fontSize: 26, marginTop: 8 }}>{`🙋 ${people} · 줍줍`}</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "NotoKR", data: font, weight: 800, style: "normal" }] : undefined, emoji: "twemoji" },
  );
}
