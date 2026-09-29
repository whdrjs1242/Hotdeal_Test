import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { DevLogin } from "@/components/DevLogin";

export const metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="flex min-h-[80dvh] flex-col justify-center px-6">
      <div className="text-center">
        <div className="text-5xl font-black text-brand">줍줍</div>
        <p className="mt-3 text-[15px] leading-relaxed text-sub">
          찾는 상품은 수배로, 발견한 핫딜은 공유로.
          <br />
          원하는 상품이 싸지면 제일 먼저 알려드릴게요.
        </p>
      </div>
      <ul className="mx-auto mt-8 space-y-2 text-sm">
        <li>🔔 키워드·목표가 핫딜 알림</li>
        <li>🎯 원하는 상품에 현상금 걸기 — 헌터가 찾아와요</li>
        <li>💸 참여·공유·발견 모두 포인트, 현금으로 교환</li>
        <li>🏆 헌터 레벨 & 시즌 랭킹</li>
      </ul>
      <a
        href={`/api/auth/kakao?next=${encodeURIComponent(next)}`}
        className="mt-10 flex h-12 items-center justify-center rounded-xl bg-[#FEE500] font-bold text-[#191919]"
      >
        카카오로 3초만에 시작하기
      </a>
      {sp.error && <p className="mt-3 text-center text-sm text-brand">로그인에 실패했어요 ({sp.error})</p>}
      {env.allowDevLogin && <DevLogin next={next} />}
    </div>
  );
}
