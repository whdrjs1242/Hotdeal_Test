"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { merchantById } from "@/lib/affiliate/merchants";
import { Img } from "@/components/Img";

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
      .then(async (r) => (await r.json()) as State & { error?: string })
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

  if (error) return <p className="px-6 pt-20 text-center text-[15px] text-sub">{error}</p>;
  if (!s) return <p className="pt-20 text-center text-[15px] text-muted">문제를 불러오고 있어요</p>;

  if (s.finished && !reveal) {
    return (
      <div className="bg-surface px-6 py-16 text-center">
        <p className="text-[15px] text-sub">오늘의 최저가 맞히기 결과</p>
        <p className="mt-2 text-[28px] font-bold">
          {s.rounds}문제 중 {s.correct}개 정답
        </p>
        <p className="mt-1 text-[15px] text-positive">+{s.reward}P 받았어요</p>
        <p className="mt-4 text-[13px] text-muted">내일 새 문제가 나와요.</p>
        <Link href="/points" className="press mt-6 inline-flex h-12 items-center rounded-xl bg-ink px-6 text-[15px] font-semibold text-surface">
          혜택으로 돌아가기
        </Link>
      </div>
    );
  }

  const q = s.question!;
  return (
    <div className="pb-10">
      <div className="bg-surface px-5 pb-5">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-semibold">
            {s.round}번째 문제 <span className="font-normal text-muted">/ {s.rounds}</span>
          </span>
          <span className="text-muted">
            정답 {s.correct}개 · +{s.reward}P
          </span>
        </div>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: s.rounds }, (_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i < s.round - 1 ? "bg-ink" : i === s.round - 1 ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>
        <div className="mt-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-fill">
          {q.image && (
            <Img src={q.image} alt="" className="h-full w-full object-contain" />
          )}
        </div>
        <p className="mt-3 text-[13px] text-muted">{merchantById(q.merchant).name}</p>
        <p className="text-[17px] font-semibold leading-snug">{q.title}</p>
        <p className="mt-1 text-[14px] text-sub">이 딜의 가격은 얼마일까요?</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 bg-surface px-5 py-5">
        {q.options.map((o, i) => {
          const isAnswer = reveal && i === reveal.answer;
          const wrong = reveal && i === reveal.choice && reveal.choice !== reveal.answer;
          return (
            <button
              key={i}
              onClick={() => answer(i)}
              className={`press tnum h-14 rounded-xl text-[17px] font-bold ${
                isAnswer ? "bg-positive text-white" : wrong ? "bg-negative text-white" : "bg-fill"
              }`}
            >
              {o.toLocaleString("ko-KR")}원
            </button>
          );
        })}
      </div>
      {reveal && (
        <div className="bg-surface px-5 pb-5">
          <p className={`text-center text-[16px] font-bold ${reveal.choice === reveal.answer ? "text-positive" : "text-negative"}`}>
            {reveal.choice === reveal.answer ? `정답이에요 · +${reveal.gained}P` : "아쉽게도 틀렸어요"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href={`/deals/${reveal.dealId}`} className="press flex h-12 items-center justify-center rounded-xl bg-fill text-[15px] font-semibold">
              이 딜 보기
            </Link>
            <button
              onClick={() => {
                setS(reveal.next);
                setReveal(null);
              }}
              className="press h-12 rounded-xl bg-ink text-[15px] font-semibold text-surface"
            >
              {reveal.next.finished ? "결과 보기" : "다음 문제"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
