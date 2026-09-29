"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Q {
  dealId: number;
  title: string;
  image: string | null;
  merchant: string;
  options: number[];
}
interface State {
  round: number;
  rounds: number;
  correct: number;
  finished: boolean;
  reward: number;
  question: Q | null;
}

export function PriceQuiz() {
  const [s, setS] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState<{ choice: number; answer: number; gained: number; dealId: number; next: State } | null>(null);

  useEffect(() => {
    fetch("/api/games/quiz")
      .then(async (r) => ((await r.json()) as State & { error?: string }))
      .then((d) => (d.error ? setError(d.error) : setS(d)));
  }, []);

  async function answer(choice: number) {
    if (reveal) return;
    const res = await fetch("/api/games/quiz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ choice }),
    });
    const d = await res.json();
    if (!res.ok) return setError(d.error);
    setReveal({ choice, answer: d.answer, gained: d.gained, dealId: d.dealId, next: d.next });
  }

  if (error) return <p className="px-6 pt-20 text-center text-sub">{error}</p>;
  if (!s) return <p className="pt-20 text-center text-sub">문제 불러오는 중…</p>;

  if (s.finished && !reveal) {
    return (
      <div className="px-6 pt-16 text-center">
        <div className="text-6xl">{s.correct === s.rounds ? "🏆" : "🏷️"}</div>
        <h1 className="mt-4 text-2xl font-black">
          {s.rounds}문제 중 {s.correct}개 정답!
        </h1>
        <p className="mt-2 text-sub">오늘 {s.reward}P를 받았어요. 내일 새 문제로 만나요.</p>
        <Link href="/points" className="mt-6 inline-block rounded-xl bg-brand px-6 py-3 font-bold text-white">
          포인트 홈으로
        </Link>
      </div>
    );
  }

  const q = s.question!;
  return (
    <div className="px-4 pb-10">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold">
          {s.round} / {s.rounds}
        </span>
        <span className="text-sub">정답 {s.correct} · 오늘 +{s.reward}P</span>
      </div>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: s.rounds }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < s.round - 1 ? "bg-brand" : i === s.round - 1 ? "bg-ink" : "bg-line"}`} />
        ))}
      </div>
      <div className="mt-4 overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
        <div className="flex aspect-[4/3] items-center justify-center bg-canvas">
          {q.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.image} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-7xl">🛍️</span>
          )}
        </div>
        <div className="p-4">
          <div className="text-xs text-sub">이 핫딜의 가격은?</div>
          <div className="mt-1 text-lg font-bold leading-snug">{q.title}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {q.options.map((o, i) => {
          const isAnswer = reveal && i === reveal.answer;
          const isWrongPick = reveal && i === reveal.choice && reveal.choice !== reveal.answer;
          return (
            <button
              key={i}
              onClick={() => answer(i)}
              className={`h-14 rounded-2xl text-lg font-black transition ${
                isAnswer ? "bg-[#1c7c3a] text-white" : isWrongPick ? "bg-cool text-white" : "bg-surface ring-1 ring-line active:scale-95"
              }`}
            >
              {o.toLocaleString("ko-KR")}원
            </button>
          );
        })}
      </div>
      {reveal && (
        <div className="mt-4 rounded-2xl bg-ink p-4 text-center text-surface">
          <div className="text-lg font-black">{reveal.choice === reveal.answer ? `정답! +${reveal.gained}P 🎉` : "아쉬워요 😢"}</div>
          <div className="mt-3 flex gap-2">
            <Link href={`/deals/${reveal.dealId}`} className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-bold">
              이 딜 보기
            </Link>
            <button
              onClick={() => {
                setS(reveal.next);
                setReveal(null);
              }}
              className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-white"
            >
              {reveal.next.finished ? "결과 보기" : "다음 문제"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
