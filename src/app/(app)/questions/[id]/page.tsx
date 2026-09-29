import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAnswers, getQuestion } from "@/lib/questions";
import { timeAgo } from "@/lib/format";
import { BackButton } from "@/components/BackButton";
import { Countdown } from "@/components/Countdown";
import { Answers } from "@/components/Answers";

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const [q, user] = await Promise.all([getQuestion(id), getCurrentUser()]);
  if (!q) notFound();
  const answers = await getAnswers(id);
  const open = q.status === "open";
  return (
    <div className="pt-safe pb-10">
      <div className="flex h-12 items-center gap-2 px-2">
        <BackButton />
        <span className="text-sm font-semibold">질문</span>
      </div>
      <article className="bg-surface px-4 py-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-lg bg-brand-soft px-2 py-1 font-black text-brand">💰 {q.reward.toLocaleString()}P</span>
          {open ? <Countdown endsAt={q.expiresAt} /> : <b className="text-sub">{q.status === "answered" ? "채택 완료" : "마감"}</b>}
        </div>
        <h1 className="mt-2 text-lg font-black leading-snug">{q.title}</h1>
        {q.body && <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{q.body}</p>}
        <div className="mt-3 text-xs text-sub">
          {q.userChar ?? "🙂"} {q.nickname} · {timeAgo(q.createdAt)}
        </div>
      </article>
      <Answers
        questionId={q.id}
        initial={answers}
        acceptedId={q.acceptedAnswerId}
        isOwner={user?.id === q.userId}
        open={open}
        loggedIn={!!user}
        myId={user?.id ?? null}
      />
    </div>
  );
}
