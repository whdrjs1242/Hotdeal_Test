"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

const input = "h-11 w-full rounded-xl bg-surface px-3 text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-brand";

export function BountyForm({ balance, minStake, maxDays }: { balance: number; minStake: number; maxDays: number }) {
  const router = useRouter();
  const [f, setF] = useState({ title: "", description: "", targetPrice: "", category: "etc", imageUrl: "", stake: minStake, days: 7 });
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
    if (!res.ok) return setError(d.error ?? "등록에 실패했어요");
    router.replace(`/bounties/${d.id}`);
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4 pb-10">
      <label className="block text-sm font-semibold">
        찾는 상품
        <input required maxLength={80} value={f.title} onChange={set("title")} className={`${input} mt-1`} placeholder="예) 다이슨 V15 디텍트 정품" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-semibold">
          목표가 <span className="font-normal text-sub">(이하)</span>
          <input value={f.targetPrice} onChange={set("targetPrice")} inputMode="numeric" className={`${input} mt-1`} placeholder="원" />
        </label>
        <label className="block text-sm font-semibold">
          카테고리
          <select value={f.category} onChange={set("category")} className={`${input} mt-1`}>
            {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-semibold">
        조건 <span className="font-normal text-sub">(색상·용량·정품 여부 등)</span>
        <textarea value={f.description} onChange={set("description")} rows={3} maxLength={1000} className={`${input} mt-1 h-auto py-2`} />
      </label>
      <label className="block text-sm font-semibold">
        참고 이미지 URL <span className="font-normal text-sub">(선택)</span>
        <input value={f.imageUrl} onChange={set("imageUrl")} inputMode="url" className={`${input} mt-1`} />
      </label>

      <div className="wanted rounded-2xl p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold">💰 현상금</span>
          <span className="text-2xl font-black">{Number(f.stake).toLocaleString()}P</span>
        </div>
        <input
          type="range"
          min={minStake}
          max={Math.max(minStake * 20, 10000)}
          step={100}
          value={f.stake}
          onChange={(e) => setF((p) => ({ ...p, stake: Number(e.target.value) }))}
          className="mt-2 w-full accent-[#c2410c]"
        />
        <p className="mt-1 text-xs opacity-80">
          현상금이 클수록 헌터가 몰리고 수배가 위로 올라가요. 채택된 헌터가 받고, 마감까지 적합한 상품이 없으면 전액 돌려드려요.
        </p>
        <p className={`mt-2 text-xs font-bold ${short ? "text-brand" : ""}`}>
          내 포인트 {balance.toLocaleString()}P {short && "— 포인트가 부족해요"}
        </p>
      </div>

      <label className="block text-sm font-semibold">
        수배 기간
        <select value={f.days} onChange={set("days")} className={`${input} mt-1`}>
          {[1, 3, 7, maxDays].map((d) => (
            <option key={d} value={d}>
              {d}일
            </option>
          ))}
        </select>
      </label>

      <button disabled={busy || short} className="h-12 w-full rounded-xl bg-[#c2410c] text-[16px] font-bold text-white disabled:opacity-40">
        {busy ? "등록 중…" : "🎯 수배지 걸기"}
      </button>
      {error && <p className="text-sm font-semibold text-brand">{error}</p>}
    </form>
  );
}
