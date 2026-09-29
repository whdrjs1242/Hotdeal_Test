import { ImageResponse } from "next/og";
import { loadKoreanFont } from "@/lib/ogFont";

/** 앱 아이콘: 주황 바탕에 흰 '줍' */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = (await params).size === "512" ? 512 : 192;
  const font = await loadKoreanFont("줍");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ff5b2e",
          color: "white",
          fontSize: size * 0.56,
          fontWeight: 800,
          fontFamily: "Kr",
        }}
      >
        줍
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: font ? [{ name: "Kr", data: font, weight: 800, style: "normal" }] : undefined,
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
  );
}
