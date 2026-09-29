"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CheckinButton({ streak, checked = false }: { streak: number; checked?: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState(checked);
  const [msg, setMsg] = useState("");
  async function checkin() {
    const res = await fetch("/api/me/checkin", { method: "POST" });
    const d = await res.json();
    setDone(true);
    if (!d.already) setMsg(`${d.streak}일째${d.bonus ? ` · +${d.bonus}P` : ""}`);
    router.refresh();
  }
  if (done) return <span className="text-[13px] font-semibold text-positive">{msg || `${streak}일째 완료`}</span>;
  return (
    <button onClick={checkin} className="press h-8 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white">
      출석하기
    </button>
  );
}
