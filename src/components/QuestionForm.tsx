"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const field = "w-full rounded-xl bg-fill px-4 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/10";

export function QuestionForm({ balance, min, days }: { balance: number; min: number; days: number }) {
  const router = useRouter();
  const [f, setF] = useState({ title: "", body: "", reward: min * 2 });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(f),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(d.error ?? d.issues?.[0]?.message ?? "등록하지 못했어요");
    router.replace(`/questions/${d.id}`);
  }
  return (
    <form onSubmit={submit} className="space-y-2 pb-10">
      <section className="space-y-4 bg-surface px-5 py-5">
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold">질문</span>
          <input required minLength={5} maxLength={100} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="예) 에어팟 프로 27만원이면 지금 사도 될까요?" className={`${field} h-12`} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold">
            자세한 내용 <span className="font-normal text-muted">(선택)</span>
          </span>
          <textarea rows={5} maxLength={2000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="용도, 예산, 비교 중인 상품을 적으면 더 좋은 답변을 받을 수 있어요" className={`${field} py-3`} />
        </label>
      </section>
      <section className="bg-surface px-5 py-5">
        <p className="mb-1.5 text-[14px] font-semibold">답변 보상</p>
        <div className="grid grid-cols-4 gap-2">
          {[min, min * 2, min * 4, min * 10].map((v) => (
            <button type="button" key={v} onClick={() => setF({ ...f, reward: v })} className={`press h-11 rounded-xl text-[14px] font-semibold ${f.reward === v ? "bg-ink text-surface" : "bg-fill"}`}>
              {v}P
            </button>
          ))}
        </div>
        <p className={`mt-2 text-[13px] ${balance < f.reward ? "text-negative" : "text-muted"}`}>
          내 포인트 {balance.toLocaleString()}P · 채택한 답변자에게 지급되고, {days}일 동안 답변이 없으면 돌려드려요.
        </p>
      </section>
      <div className="px-5 pt-2">
        <button disabled={busy || balance < f.reward} className="press h-[52px] w-full rounded-xl bg-brand text-[16px] font-semibold text-white disabled:bg-line disabled:text-muted">
          {f.reward}P 걸고 질문하기
        </button>
        {err && <p className="mt-2 text-[14px] text-negative">{err}</p>}
      </div>
    </form>
  );
}
