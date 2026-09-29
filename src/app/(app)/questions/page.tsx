import Link from "next/link";
import { listQuestions } from "@/lib/questions";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "질문" };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const status = s === "open" ? "open" : s === "answered" ? "answered" : "all";
  const items = await listQuestions(status);
  const tabs = [
    { id: "all", label: "전체" },
    { id: "open", label: "답변 기다리는 중" },
    { id: "answered", label: "채택 완료" },
  ];
  return (
    <div className="pt-safe">
      <header className="flex items-end justify-between bg-surface px-4 pb-3 pt-5">
        <div>
          <h1 className="text-xl font-black">💬 살까 말까? 질문</h1>
          <p className="text-xs text-sub">포인트를 걸고 물어보면, 채택된 답변자가 포인트를 받아요</p>
        </div>
        <Link href="/questions/new" className="rounded-full bg-ink px-3 py-1.5 text-sm font-bold text-surface">
          질문하기
        </Link>
      </header>
      <nav className="flex gap-4 border-b border-line bg-surface px-4 pt-1">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.id === "all" ? "/questions" : `/questions?s=${t.id}`}
            className={`border-b-2 pb-2 text-sm ${status === t.id ? "border-ink font-bold" : "border-transparent text-sub"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <ul className="divide-y divide-line bg-surface">
        {items.map((q) => (
          <li key={q.id}>
            <Link href={`/questions/${q.id}`} className="flex items-start gap-3 px-4 py-3.5">
              <span className="mt-0.5 rounded-lg bg-brand-soft px-2 py-1 text-xs font-black text-brand">{q.reward.toLocaleString()}P</span>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-[15px] font-semibold leading-snug">
                  {q.status === "answered" && <span className="mr-1 text-[#1c7c3a] dark:text-[#6ee7a0]">✓</span>}
                  {q.title}
                </div>
                <div className="mt-1 text-xs text-sub">
                  {q.userChar ?? "🙂"} {q.nickname} · {timeAgo(q.createdAt)} · 답변 {q.answerCount}
                </div>
              </div>
            </Link>
          </li>
        ))}
        {items.length === 0 && <li className="px-4 py-16 text-center text-sm text-sub">첫 질문을 올려보세요</li>}
      </ul>
    </div>
  );
}
