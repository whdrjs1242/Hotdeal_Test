"use client";
import { useState } from "react";
import { Marbles, n, post, useToast } from "./common";
import { merchantById } from "@/lib/affiliate/merchants";
import { Img } from "@/components/Img";

interface Card {
  id: number;
  title: string;
  image: string | null;
  merchant: string;
  price: number;
}
interface State {
  active: boolean;
  bet: number;
  pot: number;
  step: number;
  current: Card;
  history: Card[];
  odds: { up: number | null; down: number | null; pUp: number; pDown: number };
}

const BETS = [100, 500, 1000, 5000];
const MAX_STEPS = 10;

function Product({ card, hidePrice, highlight }: { card: Card; hidePrice?: boolean; highlight?: "win" | "lose" }) {
  return (
    <div
      className={`flex gap-3 rounded-2xl bg-surface p-3 ring-1 transition ${
        highlight === "win" ? "ring-2 ring-positive" : highlight === "lose" ? "ring-2 ring-negative" : "ring-line"
      }`}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-fill">
        {card.image && (
          <Img src={card.image} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-muted">{merchantById(card.merchant).name}</p>
        <p className="line-clamp-2 text-[14px] leading-snug">{card.title}</p>
        <p className="tnum mt-1 text-[18px] font-bold">{hidePrice ? "? 원" : `${n(card.price)}원`}</p>
      </div>
    </div>
  );
}

export function UpDown({ initialMarbles, initialState }: { initialMarbles: number; initialState: State | null }) {
  const [marbles, setMarbles] = useState(initialMarbles);
  const [s, setS] = useState<State | null>(initialState);
  const [bet, setBet] = useState(500);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<{ prev: Card; next: Card; correct: boolean; mult: number } | null>(null);
  const [ended, setEnded] = useState<{ payout: number; reason: "lose" | "stop" | "max" } | null>(null);
  const toast = useToast();

  async function start() {
    setBusy(true);
    try {
      const d = await post<{ state: State }>("/api/play/updown", { action: "start", bet });
      setS(d.state);
      setMarbles((m) => m - bet);
      setEnded(null);
      setReveal(null);
    } catch (e) {
      toast.show((e as Error).message);
    }
    setBusy(false);
  }

  async function guess(dir: "up" | "down") {
    if (!s || busy) return;
    setBusy(true);
    const prev = s.current;
    try {
      const d = await post<{ correct: boolean; next: Card; mult: number; marbles?: number; auto?: boolean; state: State }>("/api/play/updown", {
        action: "guess",
        dir,
      });
      setReveal({ prev, next: d.next, correct: d.correct, mult: d.mult });
      await new Promise((r) => setTimeout(r, 900));
      setS(d.state);
      if (d.marbles != null) setMarbles(d.marbles);
      if (!d.correct) setEnded({ payout: 0, reason: "lose" });
      else if (d.auto) setEnded({ payout: d.state.pot, reason: "max" });
    } catch (e) {
      toast.show((e as Error).message);
    }
    setBusy(false);
  }

  async function stop() {
    setBusy(true);
    try {
      const d = await post<{ payout: number; marbles: number }>("/api/play/updown", { action: "stop" });
      setMarbles(d.marbles);
      setEnded({ payout: d.payout, reason: "stop" });
    } catch (e) {
      toast.show((e as Error).message);
    }
    setBusy(false);
  }

  const playing = s?.active && !ended;
  return (
    <div className="space-y-4 px-5 pb-10 pt-2">
      {toast.node}
      <div className="flex items-center justify-between text-[14px]">
        <span className="text-sub">내 구슬</span>
        <Marbles value={marbles} className="text-[16px] font-bold" />
      </div>

      {!playing && !ended && (
        <>
          <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
            <h2 className="text-[17px] font-bold">다음 상품은 더 비쌀까, 더 쌀까?</h2>
            <ol className="mt-3 space-y-1.5 text-[14px] text-sub">
              <li>1. 구슬을 걸고 시작해요.</li>
              <li>2. 지금 상품보다 다음 상품이 비쌀지 쌀지 골라요. 맞히면 판돈이 배당만큼 불어나요.</li>
              <li>3. 언제든 멈추고 모은 구슬을 챙길 수 있어요. 틀리면 판돈을 잃어요. (최대 {MAX_STEPS}단계)</li>
            </ol>
          </div>
          <div>
            <p className="mb-2 text-[14px] font-semibold">걸 구슬</p>
            <div className="grid grid-cols-4 gap-2">
              {BETS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBet(b)}
                  className={`press h-11 rounded-xl text-[14px] font-semibold ${bet === b ? "bg-ink text-surface" : "bg-surface ring-1 ring-line"}`}
                >
                  {n(b)}
                </button>
              ))}
            </div>
          </div>
          <button onClick={start} disabled={busy || marbles < bet} className="press h-[52px] w-full rounded-xl bg-brand text-[16px] font-semibold text-white disabled:bg-line disabled:text-muted">
            {marbles < bet ? "구슬이 부족해요" : `구슬 ${n(bet)}개로 시작`}
          </button>
        </>
      )}

      {s && (playing || ended) && (
        <>
          <div className="grid grid-cols-3 rounded-2xl bg-surface py-3 text-center ring-1 ring-line">
            <div>
              <p className="text-[12px] text-muted">건 구슬</p>
              <p className="tnum text-[15px] font-semibold">{n(s.bet)}</p>
            </div>
            <div className="border-x border-line">
              <p className="text-[12px] text-muted">지금 챙기면</p>
              <p className={`tnum text-[18px] font-bold ${s.pot > s.bet ? "text-positive" : ""}`}>{n(ended?.reason === "lose" ? 0 : s.pot)}</p>
            </div>
            <div>
              <p className="text-[12px] text-muted">단계</p>
              <p className="tnum text-[15px] font-semibold">
                {s.step} / {MAX_STEPS}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[13px] text-muted">기준 상품</p>
            <Product card={reveal ? reveal.prev : s.current} />
            {reveal && (
              <>
                <p className="pt-1 text-[13px] text-muted">다음 상품</p>
                <Product card={reveal.next} highlight={reveal.correct ? "win" : "lose"} />
                <p className={`text-center text-[15px] font-bold ${reveal.correct ? "text-positive" : "text-negative"}`}>
                  {reveal.correct ? `맞혔어요 · 판돈 ×${reveal.mult}` : "아쉬워요, 틀렸어요"}
                </p>
              </>
            )}
          </div>

          {playing && !reveal && (
            <div className="grid grid-cols-2 gap-2">
              {(["up", "down"] as const).map((d) => {
                const m = s.odds[d];
                const p = d === "up" ? s.odds.pUp : s.odds.pDown;
                return (
                  <button
                    key={d}
                    onClick={() => guess(d)}
                    disabled={busy || !m}
                    className="press flex h-[76px] flex-col items-center justify-center rounded-2xl bg-surface ring-1 ring-line disabled:opacity-40"
                  >
                    <span className="text-[16px] font-bold">{d === "up" ? "더 비싸요" : "더 싸요"}</span>
                    <span className="tnum text-[13px] text-sub">{m ? `×${m} · 확률 ${Math.round(p * 100)}%` : "선택 불가"}</span>
                  </button>
                );
              })}
            </div>
          )}
          {playing && reveal && (
            <button onClick={() => setReveal(null)} className="press h-[52px] w-full rounded-xl bg-ink text-[16px] font-semibold text-surface">
              계속하기
            </button>
          )}
          {playing && s.step > 0 && (
            <button onClick={stop} disabled={busy} className="press h-[52px] w-full rounded-xl bg-brand text-[16px] font-semibold text-white">
              그만하고 구슬 {n(s.pot)}개 챙기기
            </button>
          )}

          {ended && (
            <div className="rounded-2xl bg-surface p-5 text-center ring-1 ring-line">
              <p className="text-[15px] text-sub">{ended.reason === "lose" ? "이번 판은 끝났어요" : ended.reason === "max" ? `${MAX_STEPS}단계를 모두 맞혔어요` : "구슬을 챙겼어요"}</p>
              <p className={`tnum mt-1 text-[28px] font-bold ${ended.payout > 0 ? "text-positive" : ""}`}>
                {ended.payout > 0 ? `+${n(ended.payout)}` : `-${n(s.bet)}`}
              </p>
              <button
                onClick={() => {
                  setS(null);
                  setEnded(null);
                  setReveal(null);
                }}
                className="press mt-4 h-11 w-full rounded-xl bg-ink text-[15px] font-semibold text-surface"
              >
                한 판 더
              </button>
            </div>
          )}
        </>
      )}

      <details className="rounded-xl bg-fill px-4 py-3 text-[13px] text-sub">
        <summary className="cursor-pointer font-semibold text-ink">배당은 어떻게 정해지나요?</summary>
        <p className="mt-2 leading-relaxed">
          최근 올라온 핫딜 가격을 기준으로, 지금 상품보다 비싼 상품이 나올 확률을 계산해요. 배당은 0.95 ÷ 확률이라 어느 쪽을 골라도 이론 환급률은
          95%예요. 거의 확실한 쪽(배당 1.01 미만)은 고를 수 없어요.
        </p>
      </details>
    </div>
  );
}
