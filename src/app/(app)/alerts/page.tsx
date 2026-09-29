import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { AlertManager } from "@/components/AlertManager";
import { PushToggle } from "@/components/PushToggle";
import { MarkRead } from "@/components/MarkRead";

export const metadata = { title: "줍줍 알림" };

export default async function AlertsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="px-6 pt-24 text-center">
        <div className="text-5xl">🔔</div>
        <h1 className="mt-4 text-xl font-black">원하는 상품이 싸지면 바로 알려드려요</h1>
        <p className="mt-2 text-sm text-sub">‘에어팟 20만원 이하’처럼 키워드와 목표가만 정해두세요.</p>
        <Link href="/login?next=/alerts" className="mt-6 inline-block rounded-xl bg-brand px-6 py-3 font-bold text-white">
          알림 설정하기
        </Link>
      </div>
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
    <div className="pt-safe">
      <h1 className="px-4 pt-4 text-xl font-black">줍줍 알림</h1>
      <div className="mt-3 space-y-2 px-3">
        <PushToggle vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        <AlertManager initial={alerts} />
      </div>
      <h2 className="mt-6 px-4 font-bold">받은 알림</h2>
      {unread && <MarkRead />}
      <ul className="mt-2 divide-y divide-line bg-surface">
        {notifications.map((n) => (
          <li key={n.id}>
            <Link href={n.dealId ? `/deals/${n.dealId}` : "#"} className={`block px-4 py-3 ${n.readAt ? "opacity-60" : ""}`}>
              <div className="text-sm font-semibold">{n.title}</div>
              {n.body && <div className="mt-0.5 line-clamp-1 text-sm text-sub">{n.body}</div>}
              <div className="mt-1 text-xs text-sub">{timeAgo(n.createdAt)}</div>
            </Link>
          </li>
        ))}
        {notifications.length === 0 && <li className="px-4 py-10 text-center text-sm text-sub">아직 받은 알림이 없어요</li>}
      </ul>
    </div>
  );
}
