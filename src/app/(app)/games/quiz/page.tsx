import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BackButton } from "@/components/BackButton";
import { PriceQuiz } from "@/components/PriceQuiz";

export const metadata = { title: "최저가 맞히기" };

export default async function QuizPage() {
  if (!(await getCurrentUser())) redirect("/login?next=/games/quiz");
  return (
    <div className="pt-safe min-h-dvh">
      <div className="flex h-12 items-center gap-2 px-2">
        <BackButton />
        <span className="text-sm font-semibold">🏷️ 최저가 맞히기</span>
      </div>
      <PriceQuiz />
    </div>
  );
}
