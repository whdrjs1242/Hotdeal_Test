import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { DevLogin } from "@/components/DevLogin";
import { Icon } from "@/components/Icon";

export const metadata = { title: "로그인" };

const VALUES = [
  { icon: "bell", title: "원하는 상품이 싸지면 알려드려요", desc: "키워드와 목표가만 정해두세요" },
  { icon: "target", title: "찾는 상품을 대신 찾아드려요", desc: "수배를 걸면 다른 사람들이 찾아와요" },
  { icon: "gift", title: "활동하면 포인트가 쌓여요", desc: "상품권으로 바꿀 수 있어요 · 가입 시 1,000P" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="flex min-h-[88dvh] flex-col bg-surface px-6 pt-16">
      <p className="text-[28px] font-extrabold tracking-tight text-brand">줍줍</p>
      <h1 className="mt-3 text-[22px] font-bold leading-snug">
        핫딜은 함께 줍고,
        <br />
        찾는 상품은 수배로.
      </h1>
      <ul className="mt-8 space-y-5">
        {VALUES.map((v) => (
          <li key={v.title} className="flex gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fill text-sub">
              <Icon name={v.icon} size={22} />
            </span>
            <span>
              <span className="block text-[15px] font-semibold">{v.title}</span>
              <span className="block text-[13px] text-muted">{v.desc}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pb-10 pt-10">
        <a
          href={`/api/auth/kakao?next=${encodeURIComponent(next)}`}
          className="press flex h-[52px] items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-[16px] font-semibold text-[#191919]"
        >
          <Icon name="comment" size={20} />
          카카오로 시작하기
        </a>
        {sp.error && <p className="mt-3 text-center text-[13px] text-negative">로그인하지 못했어요. 다시 시도해주세요.</p>}
        {env.allowDevLogin && <DevLogin next={next} />}
        <p className="mt-4 text-center text-[12px] text-muted">시작하면 이용약관과 개인정보 처리방침에 동의하는 것으로 봐요.</p>
      </div>
    </div>
  );
}
