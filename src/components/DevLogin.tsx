"use client";
import { useState } from "react";

export function DevLogin({ next }: { next: string }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/dev", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    if (!res.ok) return setError((await res.json()).error ?? "로그인하지 못했어요");
    location.href = next;
  }
  return (
    <form onSubmit={submit} className="mt-4 rounded-xl bg-fill p-3">
      <p className="mb-2 text-[12px] text-muted">개발 환경 전용 · 닉네임으로 로그인</p>
      <div className="flex gap-2">
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" className="h-11 flex-1 rounded-lg bg-surface px-3 text-[15px] outline-none" />
        <button className="press h-11 rounded-lg bg-ink px-4 text-[15px] font-semibold text-surface">시작</button>
      </div>
      {error && <p className="mt-2 text-[13px] text-negative">{error}</p>}
    </form>
  );
}
