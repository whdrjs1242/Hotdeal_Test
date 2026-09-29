import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { AlertManager } from "@/components/AlertManager";
import { PushToggle } from "@/components/PushToggle";
import { MarkRead } from "@/components/MarkRead";
import { TopBar, Empty, buttonClass } from "@/components/ui";

export const metadata = { title: "알림" };

export default async function AlertsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <TopBar title="알림" />
        <div className="bg-surface px-6 py-16 text-center">
          <p className="text-[17px] font-bold">원하는 상품이 싸지면 바로 알려드려요</p>
          <p className="mt-1 text-[14px] text-sub">예를 들어 ‘에어팟, 20만원 이하’처럼 정해둘 수 있어요.</p>
          <Link href="/login?next=/alerts" className={`${buttonClass("primary", "md")} mt-6`}>
            로그인하고 알림 설정하기
          </Link>
        </div>
      </>
    );
  }
  const [alerts, notifications] = await Promise.all([
    sql<{ id: number; keyword: string; maxPrice: number | null }[]>`
      SELECT id, keyword, max_price FROM alerts WHERE user_id = ${user.id} ORDER BY id DESC`,
    sql<{ id: number; dealId: number | null; title: string; body: string | null; readAt: Date | null; createdAt: Date }[]>`
      SELECT id, deal_id, title, body, read_at, created_at FROM notifications WHERE user_id = ${user.id} ORDER BY id DESC LIMIT 50`,
  ]);
  const unread = notifications.some((n) => !n.readAt);
  return (
    <>
      <TopBar title="알림" />
      {unread && <MarkRead />}
      <div className="space-y-2">
        <section className="bg-surface px-5 py-5">
          <PushToggle vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
          <AlertManager initial={alerts} />
        </section>
        <section className="bg-surface">
          <h2 className="px-5 pt-5 text-[17px] font-bold">받은 알림</h2>
          <ul className="divide-y divide-line">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link href={n.dealId ? `/deals/${n.dealId}` : "#"} className="flex gap-3 px-5 py-4">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brand"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold leading-snug">{n.title.replace(/^[^\p{L}\p{N}]+/u, "")}</span>
                    {n.body && <span className="mt-0.5 line-clamp-1 block text-[14px] text-sub">{n.body}</span>}
                    <span className="mt-1 block text-[12px] text-muted">{timeAgo(n.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
            {notifications.length === 0 && <Empty title="받은 알림이 없어요" desc="관심 키워드를 등록하면 새 딜이 올라올 때 알려드려요" />}
          </ul>
        </section>
      </div>
    </>
  );
}
