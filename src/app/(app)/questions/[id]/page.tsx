import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAnswers, getQuestion } from "@/lib/questions";
import { timeAgo } from "@/lib/format";
import { TopBar, Badge } from "@/components/ui";
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
    <div className="pb-10">
      <TopBar title="쇼핑 질문" />
      <article className="bg-surface px-5 pb-5 pt-2">
        <div className="flex items-center gap-2 text-[13px]">
          {open ? <Badge tone="brand">답변 보상 {q.reward.toLocaleString()}P</Badge> : <Badge tone={q.status === "answered" ? "positive" : "neutral"}>{q.status === "answered" ? "해결됨" : "마감"}</Badge>}
          {open && (
            <span className="text-muted">
              <Countdown endsAt={q.expiresAt} />
            </span>
          )}
        </div>
        <h1 className="mt-2 text-[19px] font-bold leading-snug">{q.title}</h1>
        {q.body && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{q.body}</p>}
        <p className="mt-3 text-[13px] text-muted">
          {q.nickname} · {timeAgo(q.createdAt)}
        </p>
      </article>
      <Answers questionId={q.id} initial={answers} acceptedId={q.acceptedAnswerId} isOwner={user?.id === q.userId} open={open} loggedIn={!!user} myId={user?.id ?? null} />
    </div>
  );
}
