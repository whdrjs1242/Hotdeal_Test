"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({ handle, bio, nickname }: { handle: string | null; bio: string | null; nickname: string }) {
  const router = useRouter();
  const [f, setF] = useState({ handle: handle ?? "", bio: bio ?? "", nickname });
  const [msg, setMsg] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle: f.handle || undefined, bio: f.bio, nickname: f.nickname }),
    });
    const d = await res.json();
    setMsg(res.ok ? "저장됐어요" : d.error ?? d.issues?.[0]?.message ?? "실패");
    if (res.ok) router.refresh();
  }
  const cls = "h-10 w-full rounded-xl bg-canvas px-3 text-sm outline-none";
  return (
    <form onSubmit={save} className="mt-3 space-y-2">
      <div className="flex items-center gap-1 text-sm">
        <span className="text-sub">줍줍/@</span>
        <input value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value })} placeholder="채널주소" className={cls} />
      </div>
      <input value={f.nickname} onChange={(e) => setF({ ...f, nickname: e.target.value })} placeholder="닉네임" className={cls} />
      <input value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="한 줄 소개" maxLength={160} className={cls} />
      <button className="h-10 w-full rounded-xl border border-line text-sm font-bold">저장</button>
      {msg && <p className="text-xs text-sub">{msg}</p>}
    </form>
  );
}
