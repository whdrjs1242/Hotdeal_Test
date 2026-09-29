import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/ui";
import { PriceQuiz } from "@/components/PriceQuiz";

export const metadata = { title: "최저가 맞히기" };

export default async function QuizPage() {
  if (!(await getCurrentUser())) redirect("/login?next=/games/quiz");
  return (
    <>
      <TopBar title="최저가 맞히기" />
      <PriceQuiz />
    </>
  );
}
