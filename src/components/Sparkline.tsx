import { won } from "@/lib/format";

/** 가격 히스토리 미니 차트 (서버 렌더 SVG) */
export function Sparkline({ points }: { points: { price: number; observedAt: string | Date }[] }) {
  if (points.length < 2) return null;
  const data = [...points].reverse();
  const prices = data.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const W = 300;
  const H = 60;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => (max === min ? H / 2 : H - ((v - min) / (max - min)) * (H - 8) - 4);
  const d = data.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
  const current = prices[prices.length - 1];
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-bold">가격 변동</span>
        <span className="text-xs text-sub">
          최저 {won(min)} · 최고 {won(max)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-16 w-full" preserveAspectRatio="none" role="img" aria-label="가격 변동 그래프">
        <path d={d} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {current === min && <p className="mt-1 text-xs font-bold text-brand">📉 기록된 가격 중 최저가예요!</p>}
    </div>
  );
}
