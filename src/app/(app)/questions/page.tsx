import Link from "next/link";
import { listQuestions } from "@/lib/questions";
import { getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { Badge, Empty, buttonClass } from "@/components/ui";
import { BackButton } from "@/components/BackButton";

export const metadata = { title: "쇼핑 질문" };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ s?: string; mine?: string }> }) {
  const { s, mine } = await searchParams;
  const user = mine ? await getCurrentUser() : null;
  const status = s === "open" ? "open" : s === "answered" ? "answered" : "all";
  const items = await listQuestions(status, 30, user?.id);
  const tabs = [
    { id: "all", label: "전체" },
    { id: "open", label: "답변을 기다려요" },
    { id: "answered", label: "해결됨" },
  ];
  return (
    <div className="pt-safe">
      <header className="sticky top-0 z-30 bg-surface">
        <div className="flex h-14 items-center gap-1 px-2">
          <BackButton />
          <h1 className="text-[17px] font-bold">{user ? "내 질문" : "쇼핑 질문"}</h1>
          <Link href="/questions/new" className={`${buttonClass("primary", "sm")} ml-auto mr-2`}>
            질문하기
          </Link>
        </div>
        {!user && (
          <nav className="flex gap-5 border-b border-line px-5">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={t.id === "all" ? "/questions" : `/questions?s=${t.id}`}
                className={`-mb-px border-b-2 pb-2.5 text-[15px] ${status === t.id ? "border-ink font-bold" : "border-transparent text-muted"}`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      {!user && (
        <p className="bg-surface px-5 py-3 text-[13px] text-muted">포인트를 걸고 물어보면, 채택된 답변자가 그 포인트를 받아요.</p>
      )}
      <ul className="mt-2 divide-y divide-line bg-surface">
        {items.map((q) => (
          <li key={q.id}>
            <Link href={`/questions/${q.id}`} className="block px-5 py-4 active:bg-fill">
              <div className="flex items-center gap-1.5">
                {q.status === "answered" ? <Badge tone="positive">해결됨</Badge> : q.status === "open" ? <Badge tone="brand">{q.reward.toLocaleString()}P</Badge> : <Badge>마감</Badge>}
              </div>
              <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug">{q.title}</p>
              <p className="mt-1 text-[12px] text-muted">
                {q.nickname} · {timeAgo(q.createdAt)} · 답변 {q.answerCount}
              </p>
            </Link>
          </li>
        ))}
        {items.length === 0 && <Empty title="아직 질문이 없어요" action={{ label: "질문하기", href: "/questions/new" }} />}
      </ul>
    </div>
  );
}
