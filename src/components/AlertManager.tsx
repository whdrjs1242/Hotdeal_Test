"use client";
import { useState } from "react";
import { Icon } from "./Icon";

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
    if (!res.ok) return setError(data.error ?? data.issues?.[0]?.message ?? "추가하지 못했어요");
    setItems((prev) => [data, ...prev.filter((p) => p.id !== data.id)]);
    setKeyword("");
    setMaxPrice("");
  }

  async function remove(id: number) {
    setItems((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="mt-5">
      <h2 className="text-[17px] font-bold">키워드 알림</h2>
      <p className="mt-0.5 text-[13px] text-muted">키워드가 들어간 딜이 목표가 이하로 올라오면 알려드려요.</p>
      <form onSubmit={add} className="mt-3 grid grid-cols-[1fr_108px_auto] gap-2">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="키워드" className="h-11 min-w-0 rounded-xl bg-fill px-3.5 text-[15px] outline-none placeholder:text-muted" />
        <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="목표가(선택)" inputMode="numeric" className="h-11 min-w-0 rounded-xl bg-fill px-3 text-[14px] outline-none placeholder:text-muted" />
        <button disabled={keyword.trim().length < 2} className="press h-11 rounded-xl bg-ink px-4 text-[15px] font-semibold text-surface disabled:opacity-30">
          추가
        </button>
      </form>
      {error && <p className="mt-2 text-[13px] text-negative">{error}</p>}
      {items.length === 0 ? (
        <div className="mt-3">
          <p className="text-[13px] text-muted">많이 등록하는 키워드</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => add(undefined, s)} className="press rounded-full px-3 py-1.5 text-[13px] text-sub ring-1 ring-inset ring-line">
                + {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-1 rounded-full bg-fill py-1.5 pl-3 pr-2 text-[14px]">
              <b className="font-semibold">{a.keyword}</b>
              {a.maxPrice && <span className="text-[12px] text-muted">{a.maxPrice.toLocaleString()}원 이하</span>}
              <button onClick={() => remove(a.id)} aria-label={`${a.keyword} 알림 삭제`} className="ml-0.5 text-muted">
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
