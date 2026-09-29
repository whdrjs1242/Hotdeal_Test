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
  placeholder = "쿠폰·카드 할인 같은 정보를 알려주세요",
}: {
  dealId: number;
  initial: C[];
  loggedIn: boolean;
  endpoint?: string;
  nextPath?: string;
  placeholder?: string;
}) {
  const [items, setItems] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setErr("");
    const res = await fetch(endpoint ?? `/api/deals/${dealId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) return setErr(data.error);
    setItems((prev) => [...prev, data]);
    setBody("");
  }

  return (
    <section className="bg-surface px-5 py-5">
      <h2 className="text-[17px] font-bold">
        댓글 <span className="text-muted">{items.length}</span>
      </h2>
      <ul className="mt-2 divide-y divide-line">
        {items.map((c) => {
          const lv = levelOf(c.xp);
          return (
            <li key={c.id} className="py-3">
              <p className="text-[13px] text-muted">
                <b className="font-semibold text-sub">
                  {c.userChar ? `${c.userChar} ` : ""}
                  {c.nickname}
                </b>{" "}
                · Lv.{lv.level} · {timeAgo(c.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{c.body}</p>
            </li>
          );
        })}
        {items.length === 0 && <li className="py-4 text-[14px] text-muted">아직 댓글이 없어요.</li>}
      </ul>
      {loggedIn ? (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder={placeholder}
            className="h-11 flex-1 rounded-xl bg-fill px-3.5 text-[15px] outline-none placeholder:text-muted"
          />
          <button disabled={busy || !body.trim()} className="press h-11 rounded-xl bg-ink px-4 text-[15px] font-semibold text-surface disabled:opacity-30">
            등록
          </button>
        </form>
      ) : (
        <Link href={`/login?next=${nextPath ?? `/deals/${dealId}`}`} className="mt-3 block rounded-xl bg-fill py-3 text-center text-[14px] text-sub">
          로그인하고 댓글 쓰기
        </Link>
      )}
      {err && <p className="mt-2 text-[13px] text-negative">{err}</p>}
    </section>
  );
}
