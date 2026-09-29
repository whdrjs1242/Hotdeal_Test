"use client";
import { useEffect, useState } from "react";

export const fmt = (n: number) => n.toLocaleString("ko-KR");

/** 칩 잔액 — 바뀔 때 숫자가 굴러가듯 올라간다 */
export function ChipCount({ value, className = "" }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const from = shown;
    const diff = value - from;
    if (!diff) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 600);
      setShown(Math.round(from + diff * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${className}`}>
      <span className="inline-block">🪙</span>
      {fmt(shown)}
    </span>
  );
}

const PRESETS = [10, 50, 100, 500, 1000, 5000];

export function BetPicker({ bet, setBet, chips, max = 50000 }: { bet: number; setBet: (n: number) => void; chips: number; max?: number }) {
  const clamp = (n: number) => Math.max(10, Math.min(max, Math.min(chips || 10, Math.floor(n))));
  return (
    <div className="rounded-3xl bg-white/10 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/70">베팅</span>
        <span className="font-display text-2xl text-[#ffd666]">🪙 {fmt(bet)}</span>
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setBet(clamp(p))}
            className={`btn-pop rounded-xl py-1.5 text-xs font-bold ${bet === p ? "bg-[#ffd666] text-[#3b2a1a]" : "bg-white/15"}`}
          >
            {p >= 1000 ? `${p / 1000}천` : p}
          </button>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-xs font-bold">
        <button onClick={() => setBet(clamp(bet / 2))} className="btn-pop rounded-xl bg-white/15 py-1.5">
          ½
        </button>
        <button onClick={() => setBet(clamp(bet * 2))} className="btn-pop rounded-xl bg-white/15 py-1.5">
          ×2
        </button>
        <button onClick={() => setBet(clamp(chips))} className="btn-pop rounded-xl bg-[#ff4fa3] py-1.5">
          ALL-IN
        </button>
      </div>
    </div>
  );
}

const COLORS = ["#ff5f45", "#ffd666", "#4fd1a5", "#6aa8ff", "#b18cff", "#ff8fc7"];

/** 큰 당첨 축하 꽃가루 */
export function Confetti({ fire }: { fire: number }) {
  const [pieces, setPieces] = useState<{ id: number; left: number; color: string; dur: number; delay: number }[]>([]);
  useEffect(() => {
    if (!fire) return;
    const batch = Array.from({ length: 70 }, (_, i) => ({
      id: fire * 1000 + i,
      left: Math.random() * 100,
      color: COLORS[i % COLORS.length],
      dur: 1.8 + Math.random() * 1.6,
      delay: Math.random() * 0.4,
    }));
    setPieces(batch);
    const t = setTimeout(() => setPieces([]), 4200);
    return () => clearTimeout(t);
  }, [fire]);
  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{ left: `${p.left}vw`, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
        />
      ))}
    </>
  );
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error ?? "오류가 발생했어요");
  return d as T;
}

export function useToast() {
  const [msg, setMsg] = useState("");
  const show = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2200);
  };
  const node = msg ? (
    <div className="fixed inset-x-0 top-16 z-50 mx-auto w-fit max-w-[90%] rounded-2xl bg-black/80 px-4 py-2.5 text-center text-sm font-bold text-white shadow-lg">
      {msg}
    </div>
  ) : null;
  return { show, node };
}
