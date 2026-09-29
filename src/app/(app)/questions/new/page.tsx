import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { QUESTION_POLICY } from "@/lib/rewards";
import { QuestionForm } from "@/components/QuestionForm";
import { TopBar } from "@/components/ui";

export const metadata = { title: "질문하기" };

export default async function NewQuestionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/questions/new");
  return (
    <>
      <TopBar title="질문하기" />
      <QuestionForm balance={user.pointsAvailable} min={QUESTION_POLICY.minReward} days={QUESTION_POLICY.days} />
    </>
  );
}
