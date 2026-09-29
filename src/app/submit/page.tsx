import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SubmitForm } from "@/components/SubmitForm";

export const metadata = { title: "핫딜 올리기" };

type SP = Promise<{ url?: string; text?: string; title?: string }>;

export default async function SubmitPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  // 다른 앱에서 '공유 → 줍줍'으로 들어온 경우 url/text 안의 링크를 그대로 가져온다
  const shared = sp.url || sp.text?.match(/https?:\/\/\S+/)?.[0] || "";
  const user = await getCurrentUser();
  if (!user) {
    const next = `/submit${shared ? `?url=${encodeURIComponent(shared)}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return (
    <div className="px-4 pt-safe">
      <h1 className="pt-4 text-xl font-black">핫딜 올리기</h1>
      <p className="mt-1 text-sm text-sub">쇼핑몰 링크만 붙여넣으면 상품 정보를 자동으로 채워드려요.</p>
      <SubmitForm initialUrl={shared} />
    </div>
  );
}
