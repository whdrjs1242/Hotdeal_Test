import Link from "next/link";
import { BOUNTY_POLICY, QUESTION_POLICY, ACTIVITY_POINTS } from "@/lib/rewards";

export const metadata = { title: "올리기" };

export default function NewPage() {
  return (
    <div className="pt-safe px-4">
      <h1 className="pt-6 text-xl font-black">무엇을 할까요?</h1>
      <div className="mt-5 space-y-3">
        <Link href="/submit" className="block rounded-3xl bg-surface p-5 ring-1 ring-line active:scale-[0.99]">
          <div className="text-3xl">🔥</div>
          <div className="mt-2 text-lg font-black">핫딜 공유하기</div>
          <p className="mt-1 text-sm text-sub">
            싸게 파는 걸 발견했나요? 링크만 붙여넣으면 끝. 글 작성 +{ACTIVITY_POINTS.post}P, 내가 올린 딜로 구매가 일어날 때마다 포인트가 쌓여요.
          </p>
        </Link>
        <Link
          href="/bounties/new"
          className="block rounded-3xl bg-gradient-to-br from-[#2b2118] to-[#4a3526] p-5 text-[#fbe9c9] active:scale-[0.99]"
        >
          <div className="text-3xl">🎯</div>
          <div className="mt-2 text-lg font-black">수배지 걸기</div>
          <p className="mt-1 text-sm opacity-80">
            사고 싶은 상품과 목표가를 걸면 헌터들이 대신 찾아와요. 수배가 인기를 끌어 구매자가 늘수록 나도 포인트를 받아요.
            (최소 {BOUNTY_POLICY.minStake}P)
          </p>
        </Link>
        <Link href="/questions/new" className="block rounded-3xl bg-surface p-5 ring-1 ring-line active:scale-[0.99]">
          <div className="text-3xl">💬</div>
          <div className="mt-2 text-lg font-black">살까 말까? 질문하기</div>
          <p className="mt-1 text-sm text-sub">
            포인트를 걸고 쇼핑 고민을 물어보세요. 채택한 답변자가 포인트를 받아요. (최소 {QUESTION_POLICY.minReward}P)
          </p>
        </Link>
      </div>
    </div>
  );
}
