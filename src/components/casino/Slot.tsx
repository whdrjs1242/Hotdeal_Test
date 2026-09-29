"use client";
import { useRef, useState } from "react";
import { BetPicker, ChipCount, Confetti, fmt, post, useToast } from "./common";

const SYMBOLS = ["🍒", "🍋", "🍇", "🔔", "⭐", "💎", "🐥"];

interface Res {
  reels: string[];
  multiplier: number;
  payout: number;
  chips: number;
  jackpot: boolean;
}

export function Slot({ initialChips, paytable }: { initialChips: number; paytable: { s: string; x: number }[] }) {
  const [chips, setChips] = useState(initialChips);
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState(["🐥", "🐥", "🐥"]);
  const [spinning, setSpinning] = useState([false, false, false]);
  const [result, setResult] = useState<Res | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [auto, setAuto] = useState(0);
  const autoRef = useRef(0);
  const toast = useToast();

  async function spin(): Promise<boolean> {
    if (spinning.some(Boolean)) return false;
    setResult(null);
    setSpinning([true, true, true]);
    const timer = setInterval(() => setReels(() => [0, 1, 2].map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])), 70);
    let res: Res;
    try {
      [res] = await Promise.all([post<Res>("/api/casino/slot", { bet }), new Promise((r) => setTimeout(r, 650))]);
    } catch (e) {
      clearInterval(timer);
      setSpinning([false, false, false]);
      setReels(["🐥", "🐥", "🐥"]);
      toast.show((e as Error).message);
      return false;
    }
    setChips((c) => c - bet);
    // 릴을 하나씩 멈춘다 (마지막 릴은 뜸 들이기)
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, i === 2 && res.reels[0] === res.reels[1] ? 900 : 350));
      setReels((prev) => prev.map((s, j) => (j <= i ? res.reels[j] : s)));
      setSpinning((prev) => prev.map((s, j) => (j <= i ? false : s)));
    }
    clearInterval(timer);
    setReels(res.reels);
    setChips(res.chips);
    setResult(res);
    if (res.multiplier >= 10) setConfetti((n) => n + 1);
    return res.multiplier < 10;
  }

  async function autoSpin(n: number) {
    autoRef.current = n;
    setAuto(n);
    while (autoRef.current > 0) {
      const keepGoing = await spin();
      autoRef.current -= 1;
      setAuto(autoRef.current);
      if (!keepGoing) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    autoRef.current = 0;
    setAuto(0);
  }

  const busy = spinning.some(Boolean);
  const nearMiss = !busy && result && result.multiplier === 0 && result.reels[0] === result.reels[1];
  return (
    <div className="space-y-3 px-4 pb-8">
      {toast.node}
      <Confetti fire={confetti} />
      <div className="flex justify-end">
        <ChipCount value={chips} className="rounded-2xl bg-white/10 px-3 py-1.5 text-lg font-bold text-[#ffd666]" />
      </div>

      <div className="relative rounded-[36px] bg-gradient-to-b from-[#ff6fb5] to-[#9b5cff] p-3 shadow-[0_20px_40px_-15px_rgb(255_79_163/0.6)]">
        <div className="bulbs absolute inset-1 rounded-[32px] opacity-80" />
        <div className="relative rounded-[28px] bg-[#231637] p-4">
          <div className="font-display neon text-center text-2xl text-[#ffd666]">JUPJUP SLOT</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {reels.map((s, i) => (
              <div key={i} className="flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-white to-[#ffeef7] shadow-inner">
                <span className={`text-6xl transition ${spinning[i] ? "blur-[2px] translate-y-1" : "jelly"}`}>{s}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 h-10 text-center">
            {result && result.multiplier > 0 && (
              <div className={`font-display text-3xl ${result.multiplier >= 10 ? "shimmer-text" : "text-[#ffd666]"}`}>
                {result.jackpot ? "🐥 JACKPOT! " : result.multiplier >= 10 ? "BIG WIN! " : "WIN "}+{fmt(result.payout)}
              </div>
            )}
            {result && result.multiplier === 0 && (
              <div className="text-sm text-white/70">{nearMiss ? "앗! 하나만 더… 😭" : "다음엔 터질 거예요!"}</div>
            )}
          </div>
        </div>
      </div>

      <BetPicker bet={bet} setBet={setBet} chips={chips} />

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          onClick={() => spin()}
          disabled={busy || auto > 0}
          className="btn-pop font-display h-16 rounded-3xl bg-gradient-to-b from-[#ffd666] to-[#ffae00] text-2xl text-[#3b2a1a] disabled:opacity-60"
        >
          {busy ? "두구두구…" : "SPIN!"}
        </button>
        <button
          onClick={() => (auto ? (autoRef.current = 0) : autoSpin(10))}
          className="btn-pop h-16 w-20 whitespace-pre-line rounded-3xl bg-white/15 text-xs font-bold"
        >
          {auto ? `멈춤 ${auto}` : "자동\n10회"}
        </button>
      </div>

      <details className="rounded-3xl bg-white/10 p-3 text-xs text-white/80">
        <summary className="cursor-pointer font-bold">배당표</summary>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {paytable.map((p) => (
            <span key={p.s}>
              {p.s}
              {p.s}
              {p.s} ×{fmt(p.x)}
            </span>
          ))}
          <span>🍒🍒 (아무 자리) ×2</span>
        </div>
      </details>
    </div>
  );
}
