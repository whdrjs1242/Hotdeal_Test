"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CheckinButton({ streak }: { streak: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  async function checkin() {
    const res = await fetch("/api/me/checkin", { method: "POST" });
    const d = await res.json();
    if (d.already) setMsg("오늘 출석 완료!");
    else setMsg(`🔥 ${d.streak}일 연속! +${d.xp}XP${d.bonus ? ` +${d.bonus}P` : ""}`);
    router.refresh();
  }
  return (
    <button onClick={checkin} className="rounded-xl bg-brand-soft px-3 py-2 text-xs font-bold text-brand">
      {msg ?? `출석 체크 · ${streak}일째`}
    </button>
  );
}
