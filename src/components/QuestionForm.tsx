"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function QuestionForm({ balance, min }: { balance: number; min: number }) {
  const router = useRouter();
  const [f, setF] = useState({ title: "", body: "", reward: String(min * 2) });
  const [err, setErr] = useState("");
  const reward = Number(f.reward) || 0;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, reward }),
    });
    const d = await res.json();
    if (!res.ok) return setErr(d.error ?? d.issues?.[0]?.message ?? "등록 실패");
    router.replace(`/questions/${d.id}`);
  }
  const cls = "w-full rounded-xl bg-surface px-3 text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-brand";
  return (
    <form onSubmit={submit} className="mt-5 space-y-3 pb-10">
      <input required minLength={5} maxLength={100} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="예) 에어팟 프로3 27만원이면 지금 사도 되나요?" className={`${cls} h-11`} />
      <textarea rows={5} maxLength={2000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="상황을 자세히 적을수록 좋은 답변이 와요" className={`${cls} py-2`} />
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">걸 포인트</span>
        {[min, min * 2, min * 4, min * 10].map((v) => (
          <button
            type="button"
            key={v}
            onClick={() => setF({ ...f, reward: String(v) })}
            className={`rounded-full px-3 py-1 text-xs font-bold ${reward === v ? "bg-brand text-white" : "bg-canvas"}`}
          >
            {v}P
          </button>
        ))}
      </div>
      <p className={`text-xs ${balance < reward ? "font-bold text-brand" : "text-sub"}`}>내 포인트 {balance.toLocaleString()}P</p>
      <button disabled={balance < reward} className="h-12 w-full rounded-xl bg-ink font-bold text-surface disabled:opacity-40">
        {reward}P 걸고 질문하기
      </button>
      {err && <p className="text-sm text-brand">{err}</p>}
    </form>
  );
}
