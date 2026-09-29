import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { won, compact } from "@/lib/format";
import { AdminConversionUpload, AdminDealStatus } from "@/components/Admin";

export const metadata = { title: "관리자" };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.id)) notFound();

  const [[s], byNetwork, reported] = await Promise.all([
    sql<{ users: number; newUsers: number; deals: number; clicks: number; commission: number; pendingPoints: number; availablePoints: number }[]>`
      SELECT
        (SELECT count(*)::int FROM users) AS users,
        (SELECT count(*)::int FROM users WHERE created_at > now() - interval '24 hours') AS new_users,
        (SELECT count(*)::int FROM deals WHERE created_at > now() - interval '24 hours') AS deals,
        (SELECT count(*)::int FROM clicks WHERE created_at > now() - interval '24 hours') AS clicks,
        (SELECT COALESCE(sum(commission),0)::bigint FROM conversions WHERE status <> 'canceled' AND created_at > now() - interval '30 days') AS commission,
        (SELECT COALESCE(sum(points_pending),0)::bigint FROM users) AS pending_points,
        (SELECT COALESCE(sum(points_available),0)::bigint FROM users) AS available_points`,
    sql<{ network: string; clicks: number }[]>`
      SELECT network, count(*)::int AS clicks FROM clicks WHERE created_at > now() - interval '24 hours'
      GROUP BY network ORDER BY clicks DESC`,
    sql<{ id: number; title: string; status: string; reportCount: number }[]>`
      SELECT id, title, status, report_count FROM deals WHERE report_count > 0 ORDER BY updated_at DESC LIMIT 30`,
  ]);

  return (
    <div className="space-y-3 p-4 pt-safe">
      <h1 className="text-xl font-black">관리자</h1>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Card label="전체 회원" value={compact(s.users)} sub={`+${s.newUsers} (24h)`} />
        <Card label="새 딜 (24h)" value={compact(s.deals)} />
        <Card label="구매 이동 (24h)" value={compact(s.clicks)} sub={byNetwork.map((n) => `${n.network} ${n.clicks}`).join(" · ")} />
        <Card label="수수료 (30일)" value={won(Number(s.commission))} />
        <Card label="지급 대기 포인트" value={won(Number(s.pendingPoints))} />
        <Card label="출금 가능 포인트" value={won(Number(s.availablePoints))} />
      </div>

      <section className="rounded-2xl bg-surface p-4">
        <h2 className="font-bold">제휴 실적 업로드 (CSV)</h2>
        <p className="mt-1 text-xs text-sub">
          헤더: network,external_id,sub_id,order_amount,commission,status[,ordered_at] — sub_id는 구매 링크에 실린 클릭 ID.
          같은 external_id 재업로드 시 상태만 갱신(멱등).
        </p>
        <AdminConversionUpload />
      </section>

      <section className="rounded-2xl bg-surface p-4">
        <h2 className="font-bold">신고된 딜</h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {reported.map((d) => (
            <li key={d.id} className="flex items-center gap-2 py-2">
              <Link href={`/deals/${d.id}`} className="flex-1 truncate">
                [{d.reportCount}] {d.title}
              </Link>
              <AdminDealStatus id={d.id} status={d.status} />
            </li>
          ))}
          {reported.length === 0 && <li className="py-3 text-xs text-sub">신고 없음</li>}
        </ul>
      </section>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <div className="text-xs text-sub">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
      {sub && <div className="truncate text-[11px] text-sub">{sub}</div>}
    </div>
  );
}
