"use client";
import { useState } from "react";
import { BetPicker, ChipCount, Confetti, fmt, post, useToast } from "./common";

const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colorOf = (n: number) => (n === 0 ? "#22c55e" : RED.has(n) ? "#ff4f6d" : "#2a2433");

type Choice =
  | { type: "color"; value: "red" | "black" }
  | { type: "parity"; value: "odd" | "even" }
  | { type: "half"; value: "low" | "high" }
  | { type: "number"; value: number };

const OUTSIDE: { label: string; c: Choice; cls: string }[] = [
  { label: "🔴 빨강", c: { type: "color", value: "red" }, cls: "bg-[#ff4f6d]" },
  { label: "⚫ 검정", c: { type: "color", value: "black" }, cls: "bg-[#2a2433]" },
  { label: "홀", c: { type: "parity", value: "odd" }, cls: "bg-white/15" },
  { label: "짝", c: { type: "parity", value: "even" }, cls: "bg-white/15" },
  { label: "1~18", c: { type: "half", value: "low" }, cls: "bg-white/15" },
  { label: "19~36", c: { type: "half", value: "high" }, cls: "bg-white/15" },
];

const same = (a: Choice, b: Choice) => a.type === b.type && a.value === b.value;
const SEG = 360 / ORDER.length;

function Wheel({ angle, spinning }: { angle: number; spinning: boolean }) {
  const R = 100;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2 text-3xl drop-shadow">🔻</div>
      <svg
        viewBox="-110 -110 220 220"
        className="h-full w-full drop-shadow-[0_10px_30px_rgba(255,79,163,0.45)]"
        style={{ transform: `rotate(${angle}deg)`, transition: spinning ? "transform 4.2s cubic-bezier(.12,.72,.14,1)" : "none" }}
      >
        <circle r={108} fill="#ffd666" />
        {ORDER.map((n, i) => {
          const a0 = ((i * SEG - SEG / 2 - 90) * Math.PI) / 180;
          const a1 = (((i + 1) * SEG - SEG / 2 - 90) * Math.PI) / 180;
          const mid = ((i * SEG - 90) * Math.PI) / 180;
          return (
            <g key={n}>
              <path d={`M0,0 L${R * Math.cos(a0)},${R * Math.sin(a0)} A${R},${R} 0 0 1 ${R * Math.cos(a1)},${R * Math.sin(a1)} Z`} fill={colorOf(n)} stroke="#ffd666" strokeWidth={0.6} />
              <text
                x={86 * Math.cos(mid)}
                y={86 * Math.sin(mid)}
                fill="#fff"
                fontSize={8}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${i * SEG}, ${86 * Math.cos(mid)}, ${86 * Math.sin(mid)})`}
              >
                {n}
              </text>
            </g>
          );
        })}
        <circle r={58} fill="#231637" />
        <circle r={20} fill="#ffd666" />
        <text fontSize={20} textAnchor="middle" dominantBaseline="central">
          🐥
        </text>
      </svg>
    </div>
  );
}

export function Roulette({ initialChips }: { initialChips: number }) {
  const [chips, setChips] = useState(initialChips);
  const [bet, setBet] = useState(100);
  const [choice, setChoice] = useState<Choice>({ type: "color", value: "red" });
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState<{ n: number; win: boolean; payout: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [confetti, setConfetti] = useState(0);
  const [showNumbers, setShowNumbers] = useState(false);
  const toast = useToast();

  async function spin() {
    if (spinning) return;
    let res: { number: number; multiplier: number; payout: number; chips: number };
    try {
      res = await post("/api/casino/roulette", { bet, choice });
    } catch (e) {
      return toast.show((e as Error).message);
    }
    setChips((c) => c - bet);
    setLast(null);
    setSpinning(true);
    const idx = ORDER.indexOf(res.number);
    // 현재 각도에서 5바퀴 더 돌고 해당 칸이 위(포인터)에 오도록
    const base = Math.ceil(angle / 360) * 360;
    setAngle(base + 360 * 5 + (360 - idx * SEG) + (Math.random() - 0.5) * SEG * 0.6);
    setTimeout(() => {
      setSpinning(false);
      setChips(res.chips);
      setLast({ n: res.number, win: res.multiplier > 0, payout: res.payout });
      setHistory((h) => [res.number, ...h].slice(0, 14));
      if (res.multiplier >= 10) setConfetti((n) => n + 1);
    }, 4300);
  }

  const potential = choice.type === "number" ? 36 : 2;
  return (
    <div className="space-y-3 px-4 pb-8">
      {toast.node}
      <Confetti fire={confetti} />
      <div className="flex items-center justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {history.map((n, i) => (
            <span key={i} className="flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold" style={{ background: colorOf(n) }}>
              {n}
            </span>
          ))}
        </div>
        <ChipCount value={chips} className="shrink-0 rounded-2xl bg-white/10 px-3 py-1.5 text-lg font-bold text-[#ffd666]" />
      </div>
      <Wheel angle={angle} spinning={spinning} />
      <div className="h-10 text-center">
        {last && (
          <div className={`font-display text-3xl ${last.win ? "shimmer-text" : "text-white/80"}`}>
            <span className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-xl text-white" style={{ background: colorOf(last.n) }}>
              {last.n}
            </span>
            {last.win ? `+${fmt(last.payout)}` : "아깝다!"}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {OUTSIDE.map((o) => (
          <button
            key={o.label}
            onClick={() => setChoice(o.c)}
            className={`btn-pop rounded-2xl py-2.5 text-sm font-bold ${o.cls} ${same(o.c, choice) ? "ring-4 ring-[#ffd666]" : ""}`}
          >
            {o.label} <span className="text-[10px] opacity-70">×2</span>
          </button>
        ))}
      </div>
      <button onClick={() => setShowNumbers((v) => !v)} className="w-full text-xs text-white/70">
        {showNumbers ? "숫자판 닫기 ▲" : "숫자 하나에 걸기 (×36) ▼"}
      </button>
      {showNumbers && (
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 37 }, (_, n) => (
            <button
              key={n}
              onClick={() => setChoice({ type: "number", value: n })}
              className={`rounded-lg py-1.5 text-xs font-bold ${choice.type === "number" && choice.value === n ? "ring-2 ring-[#ffd666]" : ""}`}
              style={{ background: colorOf(n) }}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      <BetPicker bet={bet} setBet={setBet} chips={chips} />
      <button
        onClick={spin}
        disabled={spinning}
        className="btn-pop font-display h-16 w-full rounded-3xl bg-gradient-to-b from-[#ffd666] to-[#ffae00] text-2xl text-[#3b2a1a] disabled:opacity-60"
      >
        {spinning ? "돌아가는 중…" : `돌려! (당첨 시 🪙${fmt(bet * potential)})`}
      </button>
    </div>
  );
}
