"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/format";

interface A {
  id: number;
  body: string;
  votesUp: number;
  createdAt: string | Date;
  userId: number;
  nickname: string;
  userChar: string | null;
}

export function Answers({
  questionId,
  initial,
  acceptedId,
  isOwner,
  open,
  loggedIn,
  myId,
}: {
  questionId: number;
  initial: A[];
  acceptedId: number | null;
  isOwner: boolean;
  open: boolean;
  loggedIn: boolean;
  myId: number | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [items, setItems] = useState(initial);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/questions/${questionId}/answers`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error);
    setBody("");
    setMsg(d.points ? `답변 등록! +${d.points}P` : "답변 등록!");
    router.refresh();
  }
  async function vote(id: number) {
    if (!loggedIn) return router.push(`/login?next=/questions/${questionId}`);
    const res = await fetch(`/api/answers/${id}/vote`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error);
    setItems((p) => p.map((a) => (a.id === id ? { ...a, votesUp: d.votesUp } : a)));
  }
  async function accept(id: number) {
    if (!confirm("이 답변을 채택할까요? 걸어둔 포인트가 답변자에게 지급돼요.")) return;
    const res = await fetch(`/api/questions/${questionId}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answerId: id }),
    });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error);
    router.refresh();
  }

  const list = [...items].sort((a, b) => Number(b.id === acceptedId) - Number(a.id === acceptedId));
  return (
    <section className="mt-2 space-y-2 px-3">
      <h2 className="px-1 pt-2 font-black">답변 {items.length}</h2>
      {list.map((a) => (
        <div key={a.id} className={`rounded-2xl bg-surface p-4 ring-1 ${a.id === acceptedId ? "ring-2 ring-[#1c7c3a]" : "ring-line"}`}>
          {a.id === acceptedId && <div className="mb-1 text-xs font-black text-[#1c7c3a] dark:text-[#6ee7a0]">🏅 채택된 답변</div>}
          <div className="text-xs text-sub">
            {a.userChar ?? "🙂"} <b className="text-ink/80">{a.nickname}</b> · {timeAgo(a.createdAt)}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{a.body}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => vote(a.id)} disabled={a.userId === myId} className="rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand disabled:opacity-50">
              👍 도움돼요 {a.votesUp}
            </button>
            {isOwner && open && (
              <button onClick={() => accept(a.id)} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-surface">
                채택하기
              </button>
            )}
          </div>
        </div>
      ))}
      {open && !isOwner && (
        loggedIn ? (
          <form onSubmit={submit} className="space-y-2 rounded-2xl bg-surface p-3 ring-1 ring-line">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} placeholder="경험·가격 비교·대안 상품 링크 등 도움이 되는 답변을 남겨주세요" className="w-full rounded-xl bg-canvas p-3 text-sm outline-none" />
            <button disabled={body.trim().length < 2} className="h-10 w-full rounded-xl bg-ink text-sm font-bold text-surface disabled:opacity-40">
              답변하기
            </button>
          </form>
        ) : (
          <a href={`/login?next=/questions/${questionId}`} className="block rounded-2xl bg-surface py-4 text-center text-sm text-sub ring-1 ring-line">
            로그인하고 답변하기
          </a>
        )
      )}
      {msg && <p className="px-1 text-sm font-semibold">{msg}</p>}
    </section>
  );
}
