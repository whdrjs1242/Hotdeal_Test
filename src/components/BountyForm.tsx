"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

const field = "h-12 w-full rounded-xl bg-fill px-4 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/10";
const label = "mb-1.5 block text-[14px] font-semibold";
const STAKES = [300, 1000, 3000, 5000];
const DAYS = [3, 7, 14];

export function BountyForm({ balance, minStake, maxDays }: { balance: number; minStake: number; maxDays: number }) {
  const router = useRouter();
  const [f, setF] = useState({ title: "", description: "", targetPrice: "", category: "etc", imageUrl: "", stake: Math.max(minStake, 1000), days: 7 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const short = balance < f.stake;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/bounties", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...f,
        targetPrice: f.targetPrice ? Number(f.targetPrice.replace(/[^\d]/g, "")) : null,
        imageUrl: f.imageUrl || null,
        description: f.description || null,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setError(d.error ?? d.issues?.[0]?.message ?? "등록하지 못했어요");
    router.replace(`/bounties/${d.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-2 pb-10">
      <section className="space-y-4 bg-surface px-5 py-5">
        <div>
          <label className={label} htmlFor="bt">
            찾는 상품
          </label>
          <input id="bt" required maxLength={80} value={f.title} onChange={set("title")} className={field} placeholder="예) 다이슨 V15 디텍트 정품" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label} htmlFor="bp">
              목표가 <span className="font-normal text-muted">(이하)</span>
            </label>
            <input id="bp" value={f.targetPrice} onChange={set("targetPrice")} inputMode="numeric" className={field} placeholder="원 · 비우면 최저가" />
          </div>
          <div>
            <label className={label} htmlFor="bc">
              카테고리
            </label>
            <select id="bc" value={f.category} onChange={set("category")} className={field}>
              {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="bd">
            조건 <span className="font-normal text-muted">(선택)</span>
          </label>
          <textarea id="bd" value={f.description} onChange={set("description")} rows={3} maxLength={1000} className={`${field} h-auto py-3`} placeholder="색상, 용량, 정품 여부 등" />
        </div>
      </section>

      <section className="space-y-4 bg-surface px-5 py-5">
        <div>
          <p className={label}>현상금</p>
          <div className="grid grid-cols-4 gap-2">
            {STAKES.filter((s) => s >= minStake).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setF((p) => ({ ...p, stake: s }))}
                className={`press h-11 rounded-xl text-[14px] font-semibold ${f.stake === s ? "bg-ink text-surface" : "bg-fill"}`}
              >
                {s.toLocaleString()}P
              </button>
            ))}
          </div>
          <p className={`mt-2 text-[13px] ${short ? "text-negative" : "text-muted"}`}>
            내 포인트 {balance.toLocaleString()}P{short ? " · 포인트가 부족해요" : ""}
          </p>
          <p className="mt-1 text-[13px] text-muted">현상금이 클수록 더 많은 사람이 찾아줘요. 적합한 상품이 없으면 마감 때 전액 돌려드려요.</p>
        </div>
        <div>
          <p className={label}>기간</p>
          <div className="grid grid-cols-3 gap-2">
            {DAYS.filter((d) => d <= maxDays).map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setF((p) => ({ ...p, days: d }))}
                className={`press h-11 rounded-xl text-[14px] font-semibold ${f.days === d ? "bg-ink text-surface" : "bg-fill"}`}
              >
                {d}일
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="px-5 pt-2">
        <button disabled={busy || short} className="press h-[52px] w-full rounded-xl bg-brand text-[16px] font-semibold text-white disabled:bg-line disabled:text-muted">
          {busy ? "등록 중" : `${f.stake.toLocaleString()}P 걸고 수배하기`}
        </button>
        {error && <p className="mt-2 text-[14px] text-negative">{error}</p>}
      </div>
    </form>
  );
}
