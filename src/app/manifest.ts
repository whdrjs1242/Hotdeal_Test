import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "줍줍 - 실시간 핫딜 공유",
    short_name: "줍줍",
    description: "모두가 찾은 최저가 핫딜. 공유하면 수익도 함께.",
    start_url: "/?utm_source=pwa",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff4d2e",
    orientation: "portrait",
    lang: "ko",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      // 다른 쇼핑앱에서 "공유 → 줍줍" 하면 바로 딜 등록 화면으로
      action: "/submit",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  } as MetadataRoute.Manifest;
}
