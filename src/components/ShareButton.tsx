"use client";
import { useState } from "react";

declare global {
  interface Window {
    Kakao?: {
      isInitialized(): boolean;
      init(key: string): void;
      Share: { sendScrap(o: { requestUrl: string }): void };
    };
  }
}

/**
 * 공유 = 성장 엔진. 로그인 사용자의 공유 링크엔 ref 코드가 붙어
 * 이 링크로 친구가 들어오면 유입 포인트, 구매로 이어지면 구매 기여 포인트가 쌓인다.
 */
export function ShareButton({
  dealId,
  title,
  shareUrl,
  rewardText,
  variant = "full",
  trackPath,
  label = "📣 공유하고 포인트 받기",
}: {
  dealId: number;
  title: string;
  shareUrl: string;
  rewardText: string;
  variant?: "full" | "icon";
  /** 공유 기록 API (기본: 딜 공유) */
  trackPath?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const track = (channel: string) =>
    fetch(trackPath ?? `/api/deals/${dealId}/share`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel }),
      keepalive: true,
    }).catch(() => {});

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `🔥 ${title}`, url: shareUrl });
        track("native");
        return;
      } catch {
        return;
      }
    }
    setOpen(true);
  }

  async function kakao() {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) return copy();
    if (!window.Kakao) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    if (!window.Kakao!.isInitialized()) window.Kakao!.init(key);
    window.Kakao!.Share.sendScrap({ requestUrl: shareUrl });
    track("kakao");
  }

  async function copy() {
    await navigator.clipboard.writeText(`🔥 ${title}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    track("copy");
  }

  return (
    <>
      {variant === "icon" ? (
        <button onClick={nativeShare} aria-label="공유" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-canvas text-xl">
          ↗
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="w-full rounded-2xl bg-ink p-4 text-left text-surface">
          <div className="text-[15px] font-bold">{label}</div>
          <div className="mt-0.5 text-xs opacity-80">{rewardText}</div>
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div className="pb-safe mx-auto w-full max-w-md rounded-t-3xl bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <h3 className="text-lg font-bold">친구에게 알려주기</h3>
            <p className="mt-1 text-sm text-sub">{rewardText}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
              <button onClick={kakao} className="flex flex-col items-center gap-1.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEE500] text-2xl">💬</span>
                카카오톡
              </button>
              <button onClick={nativeShare} className="flex flex-col items-center gap-1.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-2xl">📤</span>
                다른 앱
              </button>
              <button onClick={copy} className="flex flex-col items-center gap-1.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-2xl">{copied ? "✅" : "🔗"}</span>
                {copied ? "복사됨!" : "링크 복사"}
              </button>
            </div>
            <div className="mt-5 truncate rounded-xl bg-canvas px-3 py-2 text-xs text-sub">{shareUrl}</div>
          </div>
        </div>
      )}
    </>
  );
}
