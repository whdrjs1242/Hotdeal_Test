"use client";
import { useRef, useState } from "react";
import { BetPicker, ChipCount, Confetti, fmt, post, useToast } from "./common";

const TARGETS = [1.5, 2, 3, 5, 10, 50];

/** 로켓: 목표 배수를 정하고 발사. 폭발 전에 목표에 닿으면 자동 탈출 성공 */
export function Rocket({ initialChips, recent }: { initialChips: number; recent: number[] }) {
  const [chips, setChips] = useState(initialChips);
  const [bet, setBet] = useState(100);
  const [target, setTarget] = useState(2);
  const [mult, setMult] = useState(1);
  const [phase, setPhase] = useState<"idle" | "flying" | "escaped" | "boom">("idle");
  const [history, setHistory] = useState<number[]>(recent);
  const [confetti, setConfetti] = useState(0);
  const [payout, setPayout] = useState(0);
  const raf = useRef(0);
  const toast = useToast();

  async function launch() {
    if (phase === "flying") return;
    let res: { crash: number; win: boolean; payout: number; chips: number };
    try {
      res = await post("/api/casino/rocket", { bet, target });
    } catch (e) {
      return toast.show((e as Error).message);
    }
    setChips((c) => c - bet);
    setPhase("flying");
    setPayout(0);
    const stopAt = res.win ? target : res.crash;
    // 배수는 시간에 대해 지수적으로 증가: m = e^(k t)
    const k = 0.35;
    const duration = Math.log(stopAt) / k;
    const start = performance.now();
    const tick = (t: number) => {
      const sec = (t - start) / 1000;
      const m = Math.min(stopAt, Math.exp(k * sec));
      setMult(Math.floor(m * 100) / 100);
      if (sec < duration) raf.current = requestAnimationFrame(tick);
      else {
        setMult(stopAt);
        setChips(res.chips);
        setHistory((h) => [res.crash, ...h].slice(0, 12));
        if (res.win) {
          setPhase("escaped");
          setPayout(res.payout);
          if (target >= 5) setConfetti((n) => n + 1);
        } else setPhase("boom");
      }
    };
    raf.current = requestAnimationFrame(tick);
  }

  const height = Math.min(85, Math.log(mult) * 28);
  return (
    <div className="space-y-3 px-4 pb-8">
      {toast.node}
      <Confetti fire={confetti} />
      <div className="flex items-center justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {history.map((h, i) => (
            <span key={i} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${h >= 2 ? "bg-[#4fd1a5]/30 text-[#7ff0c5]" : "bg-white/10 text-white/70"}`}>
              {h.toFixed(2)}x
            </span>
          ))}
        </div>
        <ChipCount value={chips} className="shrink-0 rounded-2xl bg-white/10 px-3 py-1.5 text-lg font-bold text-[#ffd666]" />
      </div>

      <div className="relative h-72 overflow-hidden rounded-[32px] bg-gradient-to-b from-[#0e0a2a] via-[#2a1650] to-[#5b2a86]">
        <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(1.5px 1.5px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 20%, #fff, transparent), radial-gradient(1.5px 1.5px at 40% 70%, #fff, transparent), radial-gradient(1px 1px at 85% 60%, #fff, transparent), radial-gradient(1px 1px at 10% 80%, #fff, transparent)" }} />
        <div
          className="absolute left-1/2 -translate-x-1/2 text-6xl transition-[bottom] duration-100"
          style={{ bottom: `${8 + height}%`, transform: `translateX(-50%) rotate(${phase === "boom" ? 0 : -45}deg)` }}
        >
          {phase === "boom" ? "💥" : phase === "escaped" ? "🪂" : "🚀"}
        </div>
        <div className="absolute inset-x-0 top-6 text-center">
          <div className={`font-display text-6xl ${phase === "boom" ? "text-[#ff4f6d]" : phase === "escaped" ? "shimmer-text" : "text-white"}`}>
            {mult.toFixed(2)}x
          </div>
          <div className="mt-1 text-sm text-white/80">
            {phase === "boom" && "펑! 로켓이 터졌어요 😵"}
            {phase === "escaped" && `탈출 성공! +🪙${fmt(payout)}`}
            {phase === "flying" && `목표 ${target}x까지 버텨라…!`}
            {phase === "idle" && "목표 배수를 정하고 발사!"}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white/10 p-3">
        <div className="flex items-center justify-between text-xs text-white/70">
          <span>자동 탈출 배수</span>
          <span>성공 확률 약 {Math.round((0.99 / target) * 100)}%</span>
        </div>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {TARGETS.map((t) => (
            <button key={t} onClick={() => setTarget(t)} className={`btn-pop rounded-xl py-1.5 text-xs font-bold ${target === t ? "bg-[#4fd1a5] text-[#10332a]" : "bg-white/15"}`}>
              {t}x
            </button>
          ))}
        </div>
        <input
          type="range"
          min={101}
          max={10000}
          value={Math.round(target * 100)}
          onChange={(e) => setTarget(Number(e.target.value) / 100)}
          className="mt-3 w-full accent-[#4fd1a5]"
        />
      </div>
      <BetPicker bet={bet} setBet={setBet} chips={chips} />
      <button
        onClick={launch}
        disabled={phase === "flying"}
        className="btn-pop font-display h-16 w-full rounded-3xl bg-gradient-to-b from-[#7ff0c5] to-[#2fbf8a] text-2xl text-[#10332a] disabled:opacity-60"
      >
        {phase === "flying" ? "비행 중…" : `🚀 발사 (성공 시 🪙${fmt(Math.floor(bet * target))})`}
      </button>
    </div>
  );
}
