import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: "줍줍 — 현상금 걸면 헌터가 최저가를 찾아온다", template: "%s · 줍줍" },
  description: "원하는 상품에 현상금을 걸면 헌터들이 최저가를 찾아와요. 수배자·참여자·헌터 모두 포인트를 버는 핫딜 앱",
  applicationName: "줍줍",
  appleWebApp: { capable: true, title: "줍줍", statusBarStyle: "default" },
  openGraph: { siteName: "줍줍", type: "website", locale: "ko_KR" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#16181d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
