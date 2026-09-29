"use client";
import { useState } from "react";
import { Icon } from "./Icon";

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
 * 공유 시트. 로그인 사용자의 링크에는 추천 코드가 붙어,
 * 친구가 들어오면 방문 포인트, 구매로 이어지면 구매 포인트가 쌓인다.
 */
export function ShareButton({
  dealId,
  title,
  shareUrl,
  rewardText,
  variant = "full",
  trackPath,
  label = "공유하기",
}: {
  dealId: number;
  title: string;
  shareUrl: string;
  rewardText: string;
  variant?: "full" | "icon";
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
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title, text: title, url: shareUrl });
      track("native");
      setOpen(false);
    } catch {}
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
    await navigator.clipboard.writeText(`${title}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    track("copy");
  }

  return (
    <>
      {variant === "icon" ? (
        <button onClick={() => setOpen(true)} aria-label="공유하기" className="press flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-fill">
          <Icon name="share" />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="press flex w-full items-center gap-3 rounded-xl bg-fill px-4 py-3.5 text-left">
          <Icon name="share" size={22} className="text-sub" />
          <span className="flex-1">
            <span className="block text-[15px] font-semibold">{label}</span>
            <span className="block text-[12px] text-muted">{rewardText}</span>
          </span>
          <Icon name="chevron" size={18} className="text-muted" />
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div className="sheet-up pb-safe mx-auto w-full max-w-md rounded-t-2xl bg-surface px-5 pb-6 pt-3" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <h3 className="text-[18px] font-bold">공유하기</h3>
            <p className="mt-1 text-[13px] text-sub">{rewardText}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-[13px]">
              <button onClick={kakao} className="press flex flex-col items-center gap-2 rounded-xl py-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE500] text-[#191919]">
                  <Icon name="comment" size={22} />
                </span>
                카카오톡
              </button>
              <button onClick={copy} className="press flex flex-col items-center gap-2 rounded-xl py-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fill">
                  <Icon name={copied ? "check" : "link"} size={22} />
                </span>
                {copied ? "복사했어요" : "링크 복사"}
              </button>
              <button onClick={nativeShare} className="press flex flex-col items-center gap-2 rounded-xl py-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fill">
                  <Icon name="more" size={22} />
                </span>
                다른 앱
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
