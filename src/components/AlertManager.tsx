"use client";
import { useState } from "react";
import { won } from "@/lib/format";

interface A {
  id: number;
  keyword: string;
  maxPrice: number | null;
}

const SUGGESTIONS = ["에어팟", "닌텐도 스위치", "다이슨", "생수", "기저귀", "맥북"];

export function AlertManager({ initial }: { initial: A[] }) {
  const [items, setItems] = useState(initial);
  const [keyword, setKeyword] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [error, setError] = useState("");

  async function add(e?: React.FormEvent, kw = keyword) {
    e?.preventDefault();
    setError("");
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyword: kw, maxPrice: maxPrice ? Number(maxPrice.replace(/[^\d]/g, "")) : null }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setItems((prev) => [data, ...prev.filter((p) => p.id !== data.id)]);
    setKeyword("");
    setMaxPrice("");
  }

  async function remove(id: number) {
    setItems((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="rounded-2xl bg-surface p-4">
      <h2 className="font-bold">🎯 키워드 알림</h2>
      <p className="mt-0.5 text-xs text-sub">키워드가 들어간 딜이 목표가 이하로 올라오면 바로 알려드려요.</p>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="키워드"
          className="h-10 min-w-0 flex-1 rounded-xl bg-canvas px-3 text-sm outline-none"
        />
        <input
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="목표가(선택)"
          inputMode="numeric"
          className="h-10 w-28 rounded-xl bg-canvas px-3 text-sm outline-none"
        />
        <button className="h-10 rounded-xl bg-brand px-3 text-sm font-bold text-white">추가</button>
      </form>
      {error && <p className="mt-2 text-xs text-brand">{error}</p>}
      {items.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => add(undefined, s)} className="rounded-full border border-line px-2.5 py-1 text-xs">
              + {s}
            </button>
          ))}
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((a) => (
          <li key={a.id} className="flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-sm">
            <b>{a.keyword}</b>
            {a.maxPrice && <span className="text-xs text-sub">≤{won(a.maxPrice)}</span>}
            <button onClick={() => remove(a.id)} aria-label="삭제" className="ml-1 text-sub">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
