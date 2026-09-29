import { won } from "@/lib/format";

/** 가격 변동 — 최저/최고/현재를 숫자로 먼저 보여주고 추이는 보조 */
export function Sparkline({ points }: { points: { price: number; observedAt: string | Date }[] }) {
  if (points.length < 2) return null;
  const data = [...points].reverse();
  const prices = data.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const cur = prices[prices.length - 1];
  const W = 300;
  const H = 56;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => (max === min ? H / 2 : H - ((v - min) / (max - min)) * (H - 8) - 4);
  const d = data.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
  const fmt = (v: string | Date) => new Date(v).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  return (
    <section className="bg-surface px-5 py-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-bold">가격 변동</h2>
        {cur === min && <span className="text-[13px] font-semibold text-positive">기록된 가격 중 가장 싸요</span>}
      </div>
      <div className="mt-3 grid grid-cols-3 text-center">
        {[
          ["최저", min],
          ["최고", max],
          ["현재", cur],
        ].map(([l, v]) => (
          <div key={l as string}>
            <p className="text-[12px] text-muted">{l}</p>
            <p className="tnum text-[15px] font-semibold">{won(v as number)}</p>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-14 w-full" preserveAspectRatio="none" role="img" aria-label="가격 추이">
        <path d={d} fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{fmt(data[0].observedAt)}</span>
        <span>{fmt(data[data.length - 1].observedAt)}</span>
      </div>
    </section>
  );
}
