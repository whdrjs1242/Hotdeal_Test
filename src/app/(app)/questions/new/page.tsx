import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { QUESTION_POLICY } from "@/lib/rewards";
import { QuestionForm } from "@/components/QuestionForm";

export const metadata = { title: "질문하기" };

export default async function NewQuestionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/questions/new");
  return (
    <div className="pt-safe px-4">
      <h1 className="pt-5 text-xl font-black">💬 질문하기</h1>
      <p className="mt-1 text-sm text-sub">
        &ldquo;이 가격이면 사도 될까요?&rdquo; 같은 쇼핑 고민을 물어보세요. 건 포인트는 채택한 답변자에게 가고, {QUESTION_POLICY.days}일 동안
        답변이 없으면 돌려드려요.
      </p>
      <QuestionForm balance={user.pointsAvailable} min={QUESTION_POLICY.minReward} />
    </div>
  );
}
