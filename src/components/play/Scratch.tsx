"use client";
import { useEffect, useRef, useState } from "react";
import { Marbles, n, OddsTable, post, useToast } from "./common";

/** 은박을 긁어내는 칸 */
function Cell({ value, onRevealed, revealAll, win }: { value: number; onRevealed: () => void; revealAll: boolean; win: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(0, "#c9ced6");
    g.addColorStop(0.5, "#e6e9ee");
    g.addColorStop(1, "#b8bec8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#9aa2ad";
    ctx.font = "600 14px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("긁기", c.width / 2, c.height / 2 + 5);
  }, []);

  useEffect(() => {
    if (revealAll && !done.current) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealAll]);

  function finish() {
    if (done.current) return;
    done.current = true;
    setGone(true);
    onRevealed();
  }

  function scratch(e: React.PointerEvent<HTMLCanvasElement>) {
    if (done.current || (e.buttons === 0 && e.pointerType === "mouse")) return;
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    const ctx = c.getContext("2d")!;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height, 16, 0, Math.PI * 2);
    ctx.fill();
    // 55% 이상 긁히면 자동 공개
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let clear = 0;
    for (let i = 3; i < data.length; i += 16) if (data[i] === 0) clear++;
    if (clear / (data.length / 16) > 0.55) finish();
  }

  return (
    <div className={`relative flex h-20 items-center justify-center rounded-xl bg-surface ring-1 ${win && gone ? "ring-2 ring-brand" : "ring-line"}`}>
      <span className={`tnum text-[16px] font-bold ${win && gone ? "text-brand" : ""}`}>{n(value)}</span>
      <canvas
        ref={ref}
        width={120}
        height={80}
        onPointerDown={scratch}
        onPointerMove={scratch}
        className={`absolute inset-0 h-full w-full touch-none rounded-xl transition-opacity duration-300 ${gone ? "opacity-0" : ""}`}
      />
    </div>
  );
}

export function Scratch({ initialMarbles, cost, table }: { initialMarbles: number; cost: number; table: { prize: number; w: number }[] }) {
  const [marbles, setMarbles] = useState(initialMarbles);
  const [card, setCard] = useState<{ grid: number[]; prize: number; key: number; after: number } | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const total = table.reduce((a, x) => a + x.w, 0);

  async function buy() {
    setBusy(true);
    try {
      const d = await post<{ grid: number[]; prize: number; marbles: number }>("/api/play/scratch");
      setMarbles((m) => m - cost);
      setCard({ grid: d.grid, prize: d.prize, key: Date.now(), after: d.marbles });
      setRevealed(0);
      setAll(false);
    } catch (e) {
      toast.show((e as Error).message);
    }
    setBusy(false);
  }

  const finished = card && revealed >= 9;
  useEffect(() => {
    if (finished && card) setMarbles(card.after);
  }, [finished, card]);

  return (
    <div className="space-y-4 px-5 pb-10 pt-2">
      {toast.node}
      <div className="flex items-center justify-between text-[14px]">
        <span className="text-sub">내 구슬</span>
        <Marbles value={marbles} className="text-[16px] font-bold" />
      </div>
      <div className="rounded-2xl bg-[#fff6e8] p-4 ring-1 ring-[#f3dfbf] dark:bg-[#2a2419] dark:ring-[#4a3d27]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold">줍줍 긁는 쿠폰</h2>
          <span className="text-[12px] text-sub">같은 금액 3칸이면 그만큼 받아요</span>
        </div>
        {card ? (
          <div key={card.key} className="mt-3 grid grid-cols-3 gap-2">
            {card.grid.map((v, i) => (
              <Cell key={i} value={v} win={v === card.prize} revealAll={all} onRevealed={() => setRevealed((r) => r + 1)} />
            ))}
          </div>
        ) : (
          <div className="mt-3 flex h-[264px] items-center justify-center rounded-xl border-2 border-dashed border-[#e8cfa5] text-[14px] text-sub dark:border-[#5a4a30]">
            쿠폰을 사면 여기에 나타나요
          </div>
        )}
        {finished && (
          <p className="mt-3 text-center text-[15px]">
            {card.prize > 0 ? (
              <>
                당첨 · 구슬 <b className="text-brand">{n(card.prize)}개</b>
              </>
            ) : (
              "이번엔 꽝이에요"
            )}
          </p>
        )}
      </div>
      {card && !finished ? (
        <button onClick={() => setAll(true)} className="press h-[52px] w-full rounded-xl bg-ink text-[16px] font-semibold text-surface">
          한 번에 긁기
        </button>
      ) : (
        <button onClick={buy} disabled={busy || marbles < cost} className="press h-[52px] w-full rounded-xl bg-brand text-[16px] font-semibold text-white disabled:bg-line disabled:text-muted">
          {marbles < cost ? "구슬이 부족해요" : `쿠폰 사기 · 구슬 ${n(cost)}개`}
        </button>
      )}
      <OddsTable
        rows={table.map((t) => ({ label: t.prize ? `구슬 ${n(t.prize)}개` : "꽝", value: `${((t.w / total) * 100).toFixed(1)}%` }))}
        rtp={`${Math.round((table.reduce((a, x) => a + x.prize * x.w, 0) / total / cost) * 100)}%`}
        note={`쿠폰 1장 ${cost}개`}
      />
    </div>
  );
}
