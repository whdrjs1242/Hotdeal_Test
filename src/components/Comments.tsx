"use client";
import { useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { levelOf } from "@/lib/levels";

interface C {
  id: number;
  body: string;
  createdAt: string | Date;
  nickname: string;
  xp: number;
  userChar?: string | null;
}

export function Comments({
  dealId,
  initial,
  loggedIn,
  endpoint,
  nextPath,
}: {
  dealId: number;
  initial: C[];
  loggedIn: boolean;
  endpoint?: string;
  nextPath?: string;
}) {
  const [items, setItems] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const res = await fetch(endpoint ?? `/api/deals/${dealId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setItems((prev) => [...prev, data]);
    setBody("");
  }

  return (
    <section className="bg-surface px-4 py-4">
      <h2 className="font-bold">댓글 {items.length}</h2>
      <ul className="mt-3 space-y-3">
        {items.map((c) => (
          <li key={c.id} className="text-sm">
            <div className="text-xs text-sub">
              {c.userChar ?? levelOf(c.xp).emoji} <b className="text-ink/80">{c.nickname}</b> · {timeAgo(c.createdAt)}
            </div>
            <p className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-sub">첫 댓글로 딜 정보를 더해주세요 (쿠폰, 카드할인 등)</li>}
      </ul>
      {loggedIn ? (
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder="꿀팁 공유하기 (카드할인, 쿠폰 등)"
            className="h-11 flex-1 rounded-xl bg-canvas px-3 text-sm outline-none"
          />
          <button disabled={busy} className="h-11 rounded-xl bg-ink px-4 text-sm font-bold text-surface disabled:opacity-50">
            등록
          </button>
        </form>
      ) : (
        <Link href={`/login?next=${nextPath ?? `/deals/${dealId}`}`} className="mt-4 block rounded-xl bg-canvas py-3 text-center text-sm text-sub">
          로그인하고 댓글 남기기
        </Link>
      )}
    </section>
  );
}
