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
    if (!res.ok) return setError((await res.json()).error ?? "실패");
    location.href = next;
  }
  return (
    <form onSubmit={submit} className="mt-6 border-t border-line pt-6">
      <p className="mb-2 text-center text-xs text-sub">개발용 닉네임 로그인</p>
      <div className="flex gap-2">
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임"
          className="h-11 flex-1 rounded-xl bg-surface px-3 outline-none ring-1 ring-line"
        />
        <button className="h-11 rounded-xl bg-ink px-4 font-bold text-surface">시작</button>
      </div>
      {error && <p className="mt-2 text-sm text-brand">{error}</p>}
    </form>
  );
}
