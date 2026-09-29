"use client";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<"unsupported" | "off" | "on" | "denied" | "loading">("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    });
  }, [vapidKey]);

  async function enable() {
    setState("loading");
    try {
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
      setState("on");
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "off");
    }
  }

  if (state === "on") return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-ink p-4 text-surface">
      <span className="text-2xl">📲</span>
      <div className="flex-1 text-sm">
        <div className="font-bold">핫딜 푸시 알림 켜기</div>
        <div className="text-xs opacity-80">
          {state === "unsupported"
            ? "홈 화면에 추가(앱 설치)하면 알림을 받을 수 있어요"
            : state === "denied"
              ? "브라우저 설정에서 알림을 허용해주세요"
              : "품절 전에 먼저 알려드릴게요"}
        </div>
      </div>
      {state === "off" && (
        <button onClick={enable} className="rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white">
          켜기
        </button>
      )}
    </div>
  );
}
