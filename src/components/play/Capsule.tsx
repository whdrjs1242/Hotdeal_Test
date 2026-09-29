"use client";
import { useState } from "react";
import { Marbles, n, OddsTable, post, useToast } from "./common";

const CAPSULE_COLORS = ["#ff8a65", "#ffd166", "#6ec6ff", "#9bd18b", "#c3a6ff", "#ff9ec4"];

function Machine({ turning }: { turning: boolean }) {
  return (
    <svg viewBox="0 0 200 240" className="mx-auto h-56 w-auto" role="img" aria-label="뽑기 기계">
      <rect x="40" y="120" width="120" height="100" rx="14" fill="#ff5b2e" />
      <rect x="55" y="190" width="40" height="22" rx="6" fill="#fff" opacity=".9" />
      <circle cx="75" cy="201" r="6" fill="#191f28" opacity=".15" />
      <g style={{ transformOrigin: "128px 158px", transform: turning ? "rotate(360deg)" : "none", transition: turning ? "transform .8s ease-in-out" : "none" }}>
        <circle cx="128" cy="158" r="17" fill="#fff" />
        <rect x="122" y="146" width="12" height="24" rx="4" fill="#e5e8eb" />
      </g>
      <rect x="30" y="112" width="140" height="14" rx="7" fill="#e8491e" />
      <circle cx="100" cy="70" r="58" fill="#eef6ff" stroke="#d6e4f5" strokeWidth="3" />
      {[
        [78, 92], [100, 98], [122, 90], [88, 72], [112, 70], [70, 60], [130, 58], [100, 50], [84, 40], [116, 38],
      ].map(([x, y], i) => (
        <g key={i} className={turning ? "animate-pop" : ""}>
          <circle cx={x} cy={y} r="11" fill={CAPSULE_COLORS[i % CAPSULE_COLORS.length]} />
          <path d={`M${x - 11},${y} a11,11 0 0 0 22,0z`} fill="#fff" opacity=".7" />
        </g>
      ))}
    </svg>
  );
}

export function Capsule({ initialMarbles, cost, table }: { initialMarbles: number; cost: number; table: { prize: number; w: number }[] }) {
  const [marbles, setMarbles] = useState(initialMarbles);
  const [turning, setTurning] = useState(false);
  const [results, setResults] = useState<number[] | null>(null);
  const [opened, setOpened] = useState(0);
  const toast = useToast();
  const total = table.reduce((a, x) => a + x.w, 0);

  async function draw(count: 1 | 10) {
    if (turning) return;
    setResults(null);
    setOpened(0);
    setTurning(true);
    try {
      const [d] = await Promise.all([
        post<{ prizes: number[]; marbles: number; payout: number }>("/api/play/capsule", { count }),
        new Promise((r) => setTimeout(r, 850)),
      ]);
      setTurning(false);
      setResults(d.prizes);
      setMarbles(d.marbles);
      // 캡슐을 하나씩 연다
      for (let i = 1; i <= d.prizes.length; i++) {
        await new Promise((r) => setTimeout(r, count === 1 ? 250 : 140));
        setOpened(i);
      }
    } catch (e) {
      setTurning(false);
      toast.show((e as Error).message);
    }
  }

  const sum = results?.reduce((a, b) => a + b, 0) ?? 0;
  const best = results ? Math.max(...results) : 0;
  return (
    <div className="space-y-4 px-5 pb-10 pt-2">
      {toast.node}
      <div className="flex items-center justify-between text-[14px]">
        <span className="text-sub">내 구슬</span>
        <Marbles value={marbles} className="text-[16px] font-bold" />
      </div>
      <div className="rounded-2xl bg-surface py-6 ring-1 ring-line">
        <Machine turning={turning} />
        {results && (
          <div className="mt-4 px-4">
            <div className={`grid gap-2 ${results.length === 1 ? "grid-cols-1" : "grid-cols-5"}`}>
              {results.map((p, i) => (
                <div
                  key={i}
                  className={`flex h-14 items-center justify-center rounded-xl text-[13px] font-bold transition ${
                    i < opened ? (p > 0 ? (p >= 500 ? "bg-brand text-white" : "bg-brand-soft text-brand") : "bg-fill text-muted") : "bg-fill"
                  }`}
                >
                  {i < opened ? (p > 0 ? `+${n(p)}` : "꽝") : ""}
                </div>
              ))}
            </div>
            {opened === results.length && (
              <p className="mt-3 text-center text-[15px]">
                {sum > 0 ? (
                  <>
                    구슬 <b className="text-brand">{n(sum)}개</b>를 받았어요{best >= 1000 ? " · 큰 캡슐이 나왔어요" : ""}
                  </>
                ) : (
                  "이번엔 빈 캡슐이에요"
                )}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => draw(1)} disabled={turning || marbles < cost} className="press h-[52px] rounded-xl bg-ink text-[15px] font-semibold text-surface disabled:opacity-40">
          1번 뽑기 · {n(cost)}
        </button>
        <button onClick={() => draw(10)} disabled={turning || marbles < cost * 10} className="press h-[52px] rounded-xl bg-brand text-[15px] font-semibold text-white disabled:bg-line disabled:text-muted">
          10번 뽑기 · {n(cost * 10)}
        </button>
      </div>
      <OddsTable
        rows={table.map((t) => ({ label: t.prize ? `구슬 ${n(t.prize)}개` : "꽝", value: `${((t.w / total) * 100).toFixed(1)}%` }))}
        rtp={`${Math.round((table.reduce((a, x) => a + x.prize * x.w, 0) / total / cost) * 100)}%`}
        note={`캡슐 1개 ${cost}개`}
      />
    </div>
  );
}
