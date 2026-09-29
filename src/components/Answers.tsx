"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/format";
import { Icon } from "./Icon";
import { Badge } from "./ui";

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
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/questions/${questionId}/answers`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const d = await res.json();
    if (!res.ok) return setMsg({ ok: false, text: d.error });
    setBody("");
    setMsg({ ok: true, text: d.points ? `답변을 등록했어요 · ${d.points}P 적립` : "답변을 등록했어요" });
    router.refresh();
  }
  async function vote(id: number) {
    if (!loggedIn) return router.push(`/login?next=/questions/${questionId}`);
    const res = await fetch(`/api/answers/${id}/vote`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) return setMsg({ ok: false, text: d.error });
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
    if (!res.ok) return setMsg({ ok: false, text: d.error });
    router.refresh();
  }

  const list = [...items].sort((a, b) => Number(b.id === acceptedId) - Number(a.id === acceptedId));
  return (
    <section className="mt-2 bg-surface px-5 py-5">
      <h2 className="text-[17px] font-bold">
        답변 <span className="text-muted">{items.length}</span>
      </h2>
      <ul className="divide-y divide-line">
        {list.map((a) => (
          <li key={a.id} className="py-4">
            <div className="flex items-center gap-1.5 text-[13px] text-muted">
              {a.id === acceptedId && <Badge tone="positive">채택된 답변</Badge>}
              <b className="font-semibold text-sub">{a.nickname}</b>· {timeAgo(a.createdAt)}
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed">{a.body}</p>
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => vote(a.id)} disabled={a.userId === myId} className="press flex h-8 items-center gap-1 rounded-lg bg-fill px-2.5 text-[13px] font-semibold disabled:text-muted">
                <Icon name="thumbUp" size={15} /> 도움돼요 {a.votesUp}
              </button>
              {isOwner && open && (
                <button onClick={() => accept(a.id)} className="press h-8 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white">
                  채택하기
                </button>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="py-6 text-[14px] text-muted">첫 답변을 남겨주세요.</li>}
      </ul>
      {open &&
        !isOwner &&
        (loggedIn ? (
          <form onSubmit={submit} className="mt-2 space-y-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="경험, 가격 비교, 대안 상품 링크 등을 알려주세요"
              className="w-full rounded-xl bg-fill px-4 py-3 text-[15px] outline-none placeholder:text-muted"
            />
            <button disabled={body.trim().length < 2} className="press h-12 w-full rounded-xl bg-ink text-[15px] font-semibold text-surface disabled:opacity-30">
              답변 등록
            </button>
          </form>
        ) : (
          <a href={`/login?next=/questions/${questionId}`} className="mt-2 block rounded-xl bg-fill py-3 text-center text-[14px] text-sub">
            로그인하고 답변하기
          </a>
        ))}
      {msg && <p className={`mt-2 text-[13px] ${msg.ok ? "text-positive" : "text-negative"}`}>{msg.text}</p>}
    </section>
  );
}
