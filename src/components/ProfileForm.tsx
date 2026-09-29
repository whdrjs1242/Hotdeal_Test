"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({ handle, bio, nickname }: { handle: string | null; bio: string | null; nickname: string }) {
  const router = useRouter();
  const [f, setF] = useState({ handle: handle ?? "", bio: bio ?? "", nickname });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle: f.handle || undefined, bio: f.bio, nickname: f.nickname }),
    });
    const d = await res.json();
    setMsg(res.ok ? { ok: true, text: "저장했어요" } : { ok: false, text: d.error ?? d.issues?.[0]?.message ?? "저장하지 못했어요" });
    if (res.ok) router.refresh();
  }
  const cls = "h-11 w-full rounded-xl bg-fill px-3.5 text-[15px] outline-none placeholder:text-muted";
  return (
    <form onSubmit={save} className="mt-3 space-y-2">
      <label className="block">
        <span className="mb-1 block text-[13px] text-sub">채널 주소</span>
        <div className="flex items-center rounded-xl bg-fill pl-3.5">
          <span className="text-[15px] text-muted">jupjup.kr/@</span>
          <input value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value })} placeholder="영문·숫자" className="h-11 flex-1 bg-transparent px-1 text-[15px] outline-none" />
        </div>
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] text-sub">닉네임</span>
        <input value={f.nickname} onChange={(e) => setF({ ...f, nickname: e.target.value })} className={cls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] text-sub">소개</span>
        <input value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="한 줄 소개" maxLength={160} className={cls} />
      </label>
      <button className="press h-11 w-full rounded-xl bg-ink text-[15px] font-semibold text-surface">저장</button>
      {msg && <p className={`text-[13px] ${msg.ok ? "text-positive" : "text-negative"}`}>{msg.text}</p>}
    </form>
  );
}
