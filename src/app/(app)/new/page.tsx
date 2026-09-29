import Link from "next/link";
import { ACTIVITY_POINTS, BOUNTY_POLICY, QUESTION_POLICY } from "@/lib/rewards";
import { Icon } from "@/components/Icon";

export const metadata = { title: "글쓰기" };

const OPTIONS = [
  {
    href: "/submit",
    icon: "trend",
    title: "핫딜 공유",
    desc: "싸게 파는 곳을 알려주세요. 링크만 붙여넣으면 상품 정보가 채워져요.",
    meta: `작성 ${ACTIVITY_POINTS.post}P · 구매 발생 시 추가 포인트`,
  },
  {
    href: "/bounties/new",
    icon: "target",
    title: "수배 요청",
    desc: "사고 싶은 상품과 목표가를 적으면 다른 사람들이 대신 찾아줘요.",
    meta: `현상금 ${BOUNTY_POLICY.minStake}P부터`,
  },
  {
    href: "/questions/new",
    icon: "question",
    title: "쇼핑 질문",
    desc: "이 가격이면 사도 되는지, 더 나은 대안이 있는지 물어보세요.",
    meta: `${QUESTION_POLICY.minReward}P부터 · 채택한 답변자에게 지급`,
  },
];

export default function NewPage() {
  return (
    <div className="pt-safe">
      <header className="bg-surface px-5 pb-2 pt-6">
        <h1 className="text-[22px] font-bold">무엇을 올릴까요?</h1>
      </header>
      <ul className="divide-y divide-line bg-surface">
        {OPTIONS.map((o) => (
          <li key={o.href}>
            <Link href={o.href} className="flex items-start gap-4 px-5 py-5 active:bg-fill">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fill text-sub">
                <Icon name={o.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{o.title}</span>
                <span className="mt-0.5 block text-[14px] leading-snug text-sub">{o.desc}</span>
                <span className="mt-1.5 block text-[12px] text-muted">{o.meta}</span>
              </span>
              <Icon name="chevron" size={18} className="mt-3 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
