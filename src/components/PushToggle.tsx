"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

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
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
      await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
      setState("on");
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "off");
    }
  }

  const text =
    state === "on"
      ? "휴대폰 알림을 받고 있어요"
      : state === "unsupported"
        ? "홈 화면에 앱을 추가하면 휴대폰 알림을 받을 수 있어요"
        : state === "denied"
          ? "브라우저 설정에서 알림을 허용해주세요"
          : "휴대폰 알림을 켜면 품절 전에 먼저 알려드려요";
  return (
    <div className="flex items-center gap-3 rounded-xl bg-fill px-4 py-3.5">
      <Icon name="bell" size={22} className="text-sub" />
      <p className="flex-1 text-[14px]">{text}</p>
      {state === "off" && (
        <button onClick={enable} className="press h-8 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white">
          켜기
        </button>
      )}
    </div>
  );
}
