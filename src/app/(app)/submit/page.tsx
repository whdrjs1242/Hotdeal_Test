import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SubmitForm } from "@/components/SubmitForm";
import { TopBar } from "@/components/ui";

export const metadata = { title: "핫딜 공유" };

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
    <>
      <TopBar title="핫딜 공유" />
      <SubmitForm initialUrl={shared} />
    </>
  );
}
