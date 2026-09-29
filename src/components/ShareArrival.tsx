"use client";
import { useEffect } from "react";

/** 공유 링크(?r=)로 들어온 실제 방문을 공유자에게 알려주는 비콘 (방문자당 하루 1회 인정) */
export function ShareArrival({ type, id, code }: { type: "deal" | "bounty"; id: number; code?: string }) {
  useEffect(() => {
    if (!code) return;
    const t = setTimeout(() => {
      fetch("/api/arrivals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, id, r: code }),
        keepalive: true,
      }).catch(() => {});
    }, 1500); // 즉시 이탈하는 트래픽은 제외
    return () => clearTimeout(t);
  }, [type, id, code]);
  return null;
}
