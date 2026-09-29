import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorker } from "@/components/ServiceWorker";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: "줍줍 — 오늘의 핫딜, 줍고 나누고 벌자", template: "%s · 줍줍" },
  description: "모두가 찾은 최저가 핫딜을 실시간으로. 공유하면 수익도 함께 나눠요.",
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
        <div className="mx-auto min-h-dvh max-w-md bg-canvas shadow-sm">
          <main className="pb-24">{children}</main>
          <BottomNav />
        </div>
        <ServiceWorker />
      </body>
    </html>
  );
}
